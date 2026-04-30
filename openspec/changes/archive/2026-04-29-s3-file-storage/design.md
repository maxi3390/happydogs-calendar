# Design — s3-file-storage

## Why Garage (and not just MinIO)

Both Garage and MinIO speak S3. Both are self-hostable. Either works with the exact same env-var contract on the backend. The reason to default the bundled compose service to **Garage** rather than MinIO:

- Lightweight footprint. Garage's binary is ~30 MB and happily runs single-node. MinIO leans toward a distributed deployment model and has been moving features behind its Enterprise licenses over time.
- License clarity. Garage is AGPLv3; MinIO Community is AGPLv3 but the upstream has had licensing shifts that make bundling somewhat tricky for downstream projects.
- Simple bootstrap. Garage has a built-in CLI (`/garage bucket create`, `/garage key ...`) that's easy to wrap in a `make` target.
- Single-node mode is officially supported (unlike early MinIO which warned against it).

MinIO is a fine drop-in for operators who prefer it — they just don't bring up the `garage` compose service and point `S3_ENDPOINT_URL` at their MinIO host. The backend doesn't care.

### Rejected alternatives

- **AWS S3 only.** Excludes self-hosted / air-gapped deployments, which are the primary use case for the current audience.
- **SeaweedFS.** Also S3-compatible, but its data-model is more complex (filers, volume servers) and its S3 compatibility layer is less mature than Garage's.
- **Ceph RGW.** Far too much operational weight for a single-operator kennel.

## Why `django-storages[s3]` (and not a custom storage class)

`django-storages` is the de-facto community storage backend for Django. It already:
- Implements the full `Storage` interface (`_save`, `_open`, `exists`, `delete`, `url`, `size`, `get_modified_time`, …).
- Handles path vs virtual-hosted addressing, region probing, metadata headers, chunked uploads for large files, and signature-v4 presigning.
- Is tested against MinIO and Garage in its CI.

Writing a custom `S3Storage` would duplicate all of that for no gain. The `boto3` runtime is the de-facto AWS SDK; wrapping it ourselves wouldn't be meaningfully simpler.

### Rejected alternatives

- **minio-py** + custom storage class. Smaller dependency footprint but the integration effort (and future maintenance of a bespoke storage class) is not worth it for one backend.
- **botocore** directly (without boto3). Same argument — we'd hand-roll things django-storages already tests.

## Env-var contract: why four required vars, not one "enabled" flag

A single `S3_ENABLED=true` toggle would be simpler on paper but invites the "enabled but misconfigured" failure mode: an operator flips the flag, forgets to fill in credentials, the backend crashes at first upload. Requiring the presence of all four core vars (`S3_ENDPOINT_URL` + `S3_ACCESS_KEY_ID` + `S3_SECRET_ACCESS_KEY` + `S3_BUCKET_NAME`) naturally encodes "the configuration is complete enough to try" without a separate flag.

The fallback-to-FS-on-partial-config behavior is deliberate: if an operator sets only `S3_ENDPOINT_URL`, we do NOT assume "they meant S3" and crash — we log a warning ("S3 endpoint set but credentials missing — falling back to filesystem") and continue on the safe path. This protects against a half-applied env update bringing the whole app down.

### Rejected alternatives

- **`S3_ENABLED=true` toggle + separate var list.** Doubles the "is it on?" question: the flag plus the credential vars. Two truths to keep in sync.
- **Crash on partial config.** Worse operator experience, higher chance of downtime during deploys.

## Why a separate `S3_PUBLIC_ENDPOINT_URL`

When Garage runs in the same Compose network as the backend, the backend reaches it at `http://garage:3900`. But `profile_picture.url` returns a URL the **browser** will fetch, and the browser can't resolve `garage:3900`. The public URL must be the one exposed by Traefik (e.g. `https://s3.mydomain.com`) or by direct port publishing.

Splitting the two URLs (`S3_ENDPOINT_URL` for the backend ↔ bucket traffic, `S3_PUBLIC_ENDPOINT_URL` for the client-facing URLs baked into responses) handles this cleanly. When they happen to be the same value, the operator sets both to the same thing — no special case in code.

### Rejected alternatives

- **One URL.** Fine for AWS S3 but breaks the Compose-local Garage case.
- **Presigned URLs only.** Works without a public endpoint, but every page-load would trigger a round-trip to Django to mint URLs, and every URL expires — breaking simple `<img src>` caching. Overkill for pet profile pictures.

## Public-read bucket vs per-file ACLs

Today, `MEDIA_URL = '/media/'` is served by Django (in DEBUG) or by Traefik directly to the backend (in production) with no per-file ACL — every uploaded file is publicly readable. Moving to S3 with a public-read bucket preserves that behavior. Operators with stricter needs can flip `S3_QUERYSTRING_AUTH=True` to switch to presigned URLs, at the cost of more DB-bound URL generation.

We deliberately do NOT split storage into "public" and "private" backends in v1. The filesystem-side equivalent is already "everything public"; adding a private tier would be a new requirement, not parity with today.

### Rejected alternatives

- **All presigned, always.** Caching and CDN compatibility penalties, heavier per-URL cost.
- **Per-field `upload_to` → different buckets.** Operationally confusing; one bucket is enough for the current data model.

## Bootstrap: `make s3-init` vs auto-bootstrap in Django

Option A (the chosen path): an explicit `make s3-init` that runs Garage's CLI. Fast, idempotent, legible on a freshly-cloned machine.

Option B: the backend auto-creates bucket and key on first import. Django would need `boto3` credentials with `CreateBucket` / `CreateAccessKey` permissions, which is more privilege than a read-write data client needs. Also couples the "app is healthy enough to serve uploads" state to "bucket exists" — an annoying coupling on the deploy path.

`make s3-init` keeps the bootstrap step visible and idempotent, matching the project's existing `make seed-example-data` / `make create-admin` pattern.

### Rejected alternatives

- **Auto-bootstrap on Django startup.** Privilege bloat, startup-time failure modes, silent behavior.
- **Dedicated init container in Compose.** Works but requires a second image (the Garage CLI alone) and a healthcheck dependency, both for a two-line bootstrap. Not worth it.

## Testing strategy

- `test_storage_backend_selection.py` — unit tests with `override_settings` that toggle env vars and check `settings.STORAGES['default']['BACKEND']` and `default_storage.__class__.__name__`.
- No integration test against a running Garage (we would need to spin one up in CI). A manual verification step in the proposal's rollout notes covers the real round-trip; the in-process dispatch tests catch the selection-logic regressions that matter.
- Existing upload-flow tests (`test_pet_api`, `test_owner_api`, `test_document_api`) keep running against Django's default `InMemoryStorage` under the test settings — nothing in the test path changes.

## Security notes

- **Credentials in `.env`.** Match the existing pattern (`DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`). The repo's `.gitignore` already excludes `.env`; `.env.example` only ships placeholder values.
- **Bucket ACL.** Public-read at bucket scope mirrors today's "everything under /media is public" behavior. Presigned-URL mode is one env var away for stricter deployments.
- **Garage-internal traffic.** Stays on the `proxy` Docker network — not exposed to the host unless the operator explicitly adds a Traefik label set.
- **Rate limiting.** Not implemented here; belongs to a separate concern (reverse-proxy / WAF level).

## Open questions for review

1. **`S3_REGION_NAME` default.** Garage accepts any value; AWS rejects unknown ones. Default to `garage` (works for Garage / MinIO) and require AWS users to set a real region. OK?
2. **Traefik route for Garage.** Expose under `s3.${DOMAIN}` (subdomain, cleaner but needs DNS) or `${DOMAIN}/s3` (path-prefix, no extra DNS)?  Proposal goes with subdomain; easy to flip.
3. **Bootstrap invocation.** Manual `make s3-init` only, or also auto-run it inside `make upgrade` when the `s3` profile is on? Proposal defaults to "manual only" — auto-running it couples `upgrade` to a profile check and is surprising on hosts that don't expect S3.
