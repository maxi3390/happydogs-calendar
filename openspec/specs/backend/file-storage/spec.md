# Backend / File Storage

## Purpose

The backend stores every uploaded file — pet / owner profile pictures, the system logo, pet documents — through Django's storage abstraction so an operator can keep using the local filesystem (the historical default) or opt in to any S3-compatible bucket without a code change. The choice is driven by environment variables alone: setting the four required `S3_*` vars switches the entire backend to S3; clearing any one returns to filesystem mode. No model changes, no migrations, no per-field configuration.

## Requirements

### Requirement: The backend SHALL pick its file-storage backend from environment variables

The backend's default file storage (the Django `default` key under `STORAGES`) SHALL be chosen at startup based on a fixed set of environment variables. The chosen backend SHALL be used by every `FileField` / `ImageField` on every model (`Pet.profile_picture`, `Owner.profile_picture`, `NurserySetting.logo`, `Document.file`, plus any future fields) without per-field configuration.

The four REQUIRED env vars are:

- `S3_ENDPOINT_URL` — the URL the backend uses to talk to the bucket.
- `S3_ACCESS_KEY_ID` — bucket credentials.
- `S3_SECRET_ACCESS_KEY` — bucket credentials.
- `S3_BUCKET_NAME` — the target bucket.

The OPTIONAL env vars are:

- `S3_PUBLIC_ENDPOINT_URL` — the URL baked into client-facing `.url` responses. Defaults to `S3_ENDPOINT_URL` when unset.
- `S3_REGION_NAME` — default `garage`.
- `S3_ADDRESSING_STYLE` — default `path`.
- `S3_QUERYSTRING_AUTH` — default `False` (public-read URLs).

#### Scenario: All required vars are set — S3 is active

- GIVEN `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET_NAME` are all non-empty
- WHEN the backend starts
- THEN `settings.STORAGES['default']` SHALL resolve to `storages.backends.s3.S3Storage`
- AND every `FileField.storage` SHALL be an S3 storage instance
- AND an `INFO` log line SHALL say `File storage: S3 (endpoint=<S3_ENDPOINT_URL>, bucket=<S3_BUCKET_NAME>)`

#### Scenario: No S3 vars are set — filesystem fallback

- GIVEN none of the `S3_*` env vars are set
- WHEN the backend starts
- THEN `settings.STORAGES['default']` SHALL resolve to `django.core.files.storage.FileSystemStorage`
- AND uploads SHALL be written under `MEDIA_ROOT = BASE_DIR / 'media'` exactly as before this change
- AND an `INFO` log line SHALL say `File storage: filesystem (MEDIA_ROOT=<path>)`

#### Scenario: Partial S3 config — safe fallback with a warning

- GIVEN only a subset of the four required `S3_*` env vars are set (e.g. `S3_ENDPOINT_URL` but no credentials)
- WHEN the backend starts
- THEN the backend SHALL NOT crash
- AND it SHALL fall back to `FileSystemStorage`
- AND a `WARNING` log line SHALL name the missing vars: `S3 partially configured but credentials missing — falling back to filesystem. Missing: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY`

### Requirement: Client-facing URLs SHALL use the public endpoint

When S3 storage is active, URLs returned by `.url` on any `FileField` (via serializers like `OwnerSerializer.profile_picture_url`) SHALL be built against `S3_PUBLIC_ENDPOINT_URL` if set, or `S3_ENDPOINT_URL` otherwise. Browsers must receive URLs they can actually fetch.

#### Scenario: Internal vs public endpoint

- GIVEN `S3_ENDPOINT_URL=http://garage:3900` (internal Docker hostname)
- AND `S3_PUBLIC_ENDPOINT_URL=https://s3.example.com` (Traefik-exposed)
- WHEN a client requests `GET /api/pets/<id>/`
- THEN the returned `profile_picture_url` SHALL start with `https://s3.example.com/` and NOT with `http://garage:3900/`
- AND the backend-internal fetches (e.g. `profile_picture.read()` on the server) SHALL still go through `http://garage:3900/`

### Requirement: Switching modes SHALL NOT require a code deploy or migration

Toggling between filesystem mode and S3 mode is an env-var-only operation. No database migration, no code change, no rebuild. Existing rows keep whatever path / URL was already stored (this spec does NOT promise in-place migration of already-uploaded files; see the Out-of-scope note in the proposal).

#### Scenario: Env flip — filesystem to S3

- GIVEN a running backend with filesystem storage and 10 existing pet profile pictures on disk
- WHEN the operator sets the four required `S3_*` env vars and restarts the container
- THEN subsequent uploads SHALL land in S3
- AND the 10 pre-existing pictures SHALL still be referenced by their original filesystem paths (their `.url` will no longer resolve unless the FS is still mounted)
- AND the backend SHALL NOT attempt to auto-migrate them

### Requirement: The test suite SHALL use an in-process storage backend

Test runs SHALL NOT touch S3, regardless of the env-var state on the developer's machine. `nursery.test_settings` SHALL force `STORAGES['default']` to `django.core.files.storage.InMemoryStorage` so tests remain fast, hermetic, and independent of whether the host has Garage running.

#### Scenario: Tests ignore host env

- GIVEN the host machine has `S3_*` env vars pointing at a production Garage
- WHEN `manage.py test --settings=nursery.test_settings` runs
- THEN no S3 traffic SHALL leave the process
- AND uploaded fixtures SHALL live in memory for the duration of the test and vanish on teardown
