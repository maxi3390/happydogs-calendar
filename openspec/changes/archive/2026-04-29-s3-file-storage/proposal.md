# Proposal — s3-file-storage

## Intent

The backend currently stores every uploaded file — pet / owner profile pictures, the nursery logo, and pet documents — on the local filesystem under `MEDIA_ROOT = BASE_DIR / 'media'`. That works fine for the single-container Docker setup we ship today, but it's the wrong shape for anything beyond a single host: losing the container or the bind-mount loses the files, horizontal scaling isn't possible, and backups must handle the volume separately from the database.

Offer an S3-compatible object-storage backend as an opt-in alternative. Operators who set the relevant env vars get their uploads routed to any S3-compatible bucket (MinIO, Garage, Backblaze B2, AWS S3, …). Operators who don't set any env var keep the current filesystem behavior unchanged — zero-config, zero-migration, fully backward compatible.

To make "turn it on in one machine" ergonomic, we bundle [Garage](https://garagehq.deuxfleurs.fr/) as a service in `docker-compose.yml` behind a Compose `profile`, so it's only brought up when explicitly requested (`docker compose --profile s3 up -d`). The service is fully optional; the same env-var contract works for any other S3-compatible endpoint an operator prefers.

## Scope

### In scope

- **Backend storage abstraction.** Django 5.1's `STORAGES` setting is configured in `backend/nursery/settings.py` to pick `storages.backends.s3.S3Storage` when the S3 env vars are present, and `django.core.files.storage.FileSystemStorage` otherwise. No model or migration changes are needed — `FileField` / `ImageField` use whatever `default` storage resolves to at runtime.
- **Env-var contract.** A single, well-defined set of env vars drives the decision:
  - `S3_ENDPOINT_URL` — internal URL the backend uses to talk to the bucket (e.g. `http://garage:3900`).
  - `S3_PUBLIC_ENDPOINT_URL` — URL the browser will see when loading `profile_picture.url` / `file.url`. Can be the same as the internal URL when Garage is exposed directly, or different when routed through Traefik.
  - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` — the bucket's credentials.
  - `S3_BUCKET_NAME` — the target bucket.
  - `S3_REGION_NAME` (optional, default `garage`) — region label; most S3-compatible services accept any non-empty value.
  - `S3_ADDRESSING_STYLE` (optional, default `path`) — `path` for Garage / MinIO / local dev, `virtual` for AWS S3.
  - `S3_QUERYSTRING_AUTH` (optional, default `False`) — when `True`, `url()` returns presigned URLs that expire; when `False` (the baseline), returns direct public URLs. Matches the current filesystem behavior (all uploaded files are effectively public via `MEDIA_URL`).
  - Selection rule: if ALL of `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` are set and non-empty, S3 is active; otherwise fall back to filesystem.
- **Dependencies.** Add `django-storages[s3]>=1.14` (pulls `boto3`) to `backend/requirements.txt`. The package is only imported when the S3 path is active, so a FS-only deployment pays no runtime cost beyond an extra import.
- **Garage service in Compose.** A new `garage` service in `docker-compose.yml` under `profiles: [s3]`, pinned to a tagged release, with:
  - A `garage.toml` config file mounted from `./infra/garage/garage.toml` (committed; dev-safe defaults, credentials come from env vars).
  - Two persistent named volumes: `garage_meta` for the database and `garage_data` for the actual blobs. Both `external: true` under the same naming convention as `postgres_data` (so `docker compose down -v` can't drop them).
  - Exposed on the internal `proxy` network so the backend can reach it at `http://garage:3900` without leaving Docker.
  - Optional Traefik route (`s3.${DOMAIN}` OR `${DOMAIN}/s3`) when operators want public browser access to the bucket. Traefik labels are committed but the router only activates when the `s3` profile is selected.
- **Bootstrap.** A `make s3-init` target that:
  1. Waits for Garage to be healthy.
  2. Creates the bucket named `$S3_BUCKET_NAME` if missing.
  3. Creates an access key named `$S3_ACCESS_KEY_ID` with secret `$S3_SECRET_ACCESS_KEY` if missing.
  4. Attaches read-write permissions on the bucket to that key.
  5. Optionally sets the bucket's website-like public-read policy so public URLs work.
  Idempotent — safe to re-run.
- **Docs.** `AGENTS.md` grows a short section describing the two modes (filesystem vs S3) and the env-var contract. `.env.example` adds the `S3_*` keys with commented-out example values.
- **Regression coverage.** Django's test harness runs with `DEFAULT_FILE_STORAGE=InMemoryStorage` (Django 4.2+); nothing else needed in the test path. A small set of unit tests verifies the env-var-driven dispatch (`test_storage_backend_selection.py`): with S3 vars set → `S3Storage`; without → `FileSystemStorage`; partially set → still falls back to FS so a half-configured env doesn't brick uploads.

### Out of scope

- **Migrating existing files.** A running deployment with files already on disk keeps them on disk by default. A migration from FS → S3 (or vice versa) is a one-shot operator task best handled by a standalone `aws s3 cp --recursive` or `rclone` script, not bundled into this change. Document the migration path in `AGENTS.md` as a follow-up; don't automate it here.
- **Per-field storage policies.** Every `ImageField` / `FileField` shares the same storage backend. No split between "profile pictures public, documents private" in v1 — the current filesystem system serves both publicly through `MEDIA_URL`, so parity is maintained.
- **Image resizing / thumbnails.** Still client-side responsibility (the WeightInput / ProfilePictureUpload components already have crop logic). An S3 backend doesn't change that story.
- **Virus scanning.** Still out of scope — validator-based type/size checks continue to gate uploads at the Django layer.
- **Multi-bucket support.** One bucket per deployment is enough for now.
- **Compose profile wiring for `docs` / `pgadmin`.** Unchanged.

## Approach

1. **Add the dependency**: `django-storages[s3]>=1.14` → `requirements.txt`. Pin to a specific version so upgrades are deliberate.
2. **Rewrite the `STORAGES` section of `settings.py`** to be env-driven. Expose a helper `_s3_configured()` that returns `True` iff the four required vars are non-empty. When true, configure `storages.backends.s3.S3Storage` for the `default` key with the `S3_*` values plus sensible defaults (`addressing_style='path'`, `region_name='garage'`, `querystring_auth=False`). When false, use Django's `FileSystemStorage` — identical to today's behavior.
3. **Commit `infra/garage/garage.toml`** — a minimal TOML that pulls the S3 API key/secret from env vars (Garage supports env interpolation since 0.9). Storage engines are `sqlite` for metadata and `lmdb` for the actual block store (both bundle-friendly; no external deps).
4. **Add the `garage` service to `docker-compose.yml`** under `profiles: [s3]`. Include healthcheck hitting `:3903/health`. Declare external volumes `garage_meta` and `garage_data`.
5. **Add a `make s3-init` target** that runs `docker compose --profile s3 exec garage /garage bucket create ...` and `/garage key create ... && /garage bucket allow ...`. Make it idempotent (check existence before creating). Wire it into `make upgrade` only if the `s3` profile is active.
6. **Extend `.env.example`** with the new keys (commented out by default so a fresh checkout is still filesystem-mode).
7. **Add `backend/pets/tests/test_storage_backend_selection.py`** to cover the three cases (fully configured → S3, unset → FS, partial → FS).
8. **Two OpenSpec deltas**: a new `backend/file-storage` capability (storage abstraction + env contract + fallback rule) and a new `tooling/object-storage` capability (Garage lifecycle + bootstrap + optional Traefik routing).

## Rollout notes

- Existing deployments: **no action required** on upgrade. Env vars unset = current behavior.
- New deployments that want S3:
  1. Fill in `S3_*` vars in `.env`.
  2. `docker compose --profile s3 up -d`
  3. `make s3-init`
  4. Upload something from the UI, confirm it appears in Garage's admin (or via `aws --endpoint-url … s3 ls`).
- Backup story: when S3 is on, `make backup` (currently only dumps Postgres) should be paired with a Garage-side snapshot. Document this; don't bundle it into `make backup` yet (tooling/backup spec is scoped to the DB).
