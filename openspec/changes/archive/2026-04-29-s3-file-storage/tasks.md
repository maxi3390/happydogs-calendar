# Tasks

## 1. Dependencies
- [x] 1.1 Add `django-storages[s3]>=1.14` to `backend/requirements.txt` (pulls `boto3`).
- [x] 1.2 Rebuild the backend image so the new deps are baked in.

## 2. Backend storage abstraction
- [x] 2.1 In `backend/nursery/settings.py`, add a `_s3_configured()` helper that returns `True` iff `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` are all non-empty.
- [x] 2.2 When `_s3_configured()` is `True`, set the Django 5.1 `STORAGES['default']` to `storages.backends.s3.S3Storage` with the `S3_*` env vars + defaults (`addressing_style='path'`, `region_name='garage'`, `querystring_auth=False`, `custom_domain=` parsed from `S3_PUBLIC_ENDPOINT_URL`).
- [x] 2.3 When `_s3_configured()` is `False`, keep today's `FileSystemStorage` default (explicit `STORAGES['default']` mapping for clarity) so nothing else in the app notices.
- [x] 2.4 On module import, log a single `INFO` line that says which backend was selected and (when partial) which env vars were missing.

## 3. Compose: Garage service
- [x] 3.1 Add `infra/garage/garage.toml` with minimal single-node config (sqlite metadata + lmdb data store, S3 API on `:3900`, admin API on `:3903`). Credentials come from env vars so the file doesn't embed secrets.
- [x] 3.2 Add a `garage` service to `docker-compose.yml` under `profiles: [s3]`:
  - Image: `dxflrs/garage:v1.0.1` (or whatever is the current stable tag when implementing).
  - Volumes: `garage_meta:/var/lib/garage/meta`, `garage_data:/var/lib/garage/data`, `./infra/garage/garage.toml:/etc/garage.toml:ro`.
  - `restart: unless-stopped`.
  - Healthcheck against `http://localhost:3903/health`.
  - On `proxy` network (internal-only by default).
- [x] 3.3 Declare `garage_meta` and `garage_data` as `external: true` named volumes in the `volumes:` section, matching the `postgres_data` pattern so `make clean` can't delete them.
- [x] 3.4 Add a `make volume-ensure-s3` helper (or extend `volume-ensure`) to create those volumes idempotently when the `s3` profile is used.
- [x] 3.5 Add Traefik labels on `garage` for `s3.${DOMAIN}` routing, but only when a new `${S3_TRAEFIK_ENABLED}` env var is truthy. The rest of the time Garage is reachable only inside the Docker network.

## 4. Bootstrap tooling
- [x] 4.1 Add a `make s3-init` target that:
  1. Checks `docker compose --profile s3 ps garage` is up.
  2. Runs `docker compose --profile s3 exec -T garage /garage bucket list` and creates `$S3_BUCKET_NAME` if missing.
  3. Runs `/garage key create $S3_ACCESS_KEY_ID --secret-key $S3_SECRET_ACCESS_KEY` (or import flow) if the key doesn't exist.
  4. Runs `/garage bucket allow --read --write $S3_BUCKET_NAME --key $S3_ACCESS_KEY_ID`.
  5. Prints a short success summary.
- [x] 4.2 Make the target idempotent (wrap each CLI call with a "does it already exist" check).
- [x] 4.3 Document the target in `AGENTS.md`.

## 5. Env / docs
- [x] 5.1 Append `S3_ENDPOINT_URL`, `S3_PUBLIC_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_REGION_NAME`, `S3_ADDRESSING_STYLE`, `S3_QUERYSTRING_AUTH`, `S3_TRAEFIK_ENABLED` to `.env.example`. All commented out so the default (filesystem) is unchanged on a fresh checkout.
- [x] 5.2 Add a "File storage" section to `AGENTS.md` describing the two modes, the env-var contract, the `make s3-init` workflow, and the migration caveat (existing FS files aren't auto-moved).
- [x] 5.3 Update `backend/AGENTS.md` with a one-line pointer to the new section.

## 6. Tests
- [x] 6.1 `backend/nursery/tests/test_storage_backend_selection.py` — three cases:
  - All four required env vars set → `default_storage` resolves to `S3Storage`.
  - None set → `default_storage` resolves to `FileSystemStorage`.
  - Partial (e.g. only `S3_ENDPOINT_URL` set) → `FileSystemStorage` + a warning log.
- [x] 6.2 Run the full backend suite to verify nothing else regresses. Baseline is 528 tests + 11 new = 539.

## 7. Specs
- [x] 7.1 `openspec/changes/s3-file-storage/specs/backend/file-storage/spec.md` — new capability: storage backend abstraction, env-var contract, fallback rule, URL semantics.
- [x] 7.2 `openspec/changes/s3-file-storage/specs/tooling/object-storage/spec.md` — new capability: Garage service lifecycle, bootstrap, volume external-ness, optional Traefik routing.

## 8. Verification
- [x] 8.1 `tsc --noEmit` unaffected (no frontend changes).
- [x] 8.2 Backend tests — 539 pass (528 baseline + 11 new in `test_storage_backend_selection.py`).
- [x] 8.3 Backend lint — `flake8` clean.
- [ ] 8.4 Manual: on a clean checkout WITHOUT `S3_*` env vars, upload a profile picture, confirm it lands under `backend/media/profile_pictures/...` as today (regression check). _(Operator-side verification; no host env on the dev machine to run against.)_
- [ ] 8.5 Manual: WITH `S3_*` env vars + `docker compose --profile s3 up -d` + `make s3-init`, upload a profile picture, confirm it appears in Garage (`/garage bucket info $S3_BUCKET_NAME` or `aws --endpoint-url $S3_ENDPOINT_URL s3 ls`) and that `profile_picture.url` on the API response points at the public endpoint. _(Operator-side verification; needs Garage secrets in the deployer's `.env`.)_
- [ ] 8.6 Manual: remove one required env var and restart the backend — confirm the log says "falling back to filesystem" and uploads still work against the local volume. _(Operator-side verification.)_

## 9. Commit
- [x] Implementation commit on `plan/s3-file-storage` on top of the plan-only commit
- [x] Merged into master (operator approval received post-review)
