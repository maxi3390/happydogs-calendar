# Tooling / Object Storage

## Purpose

Operators who want self-hosted S3-compatible object storage in a single machine SHALL be able to bring it up with one Compose profile flip and one `make` target. The repo bundles [Garage](https://garagehq.deuxfleurs.fr/) as the default backend (lightweight single-node footprint, AGPLv3, simple bootstrap CLI), but the same env-var contract on the backend works against any external S3 service (MinIO, AWS S3, Backblaze B2, …) — operators who prefer those skip the bundled service entirely.

## Requirements

### Requirement: Compose SHALL ship an optional Garage service for self-hosted S3 storage

The `docker-compose.yml` file SHALL include a `garage` service that brings up a single-node Garage instance. The service SHALL be gated behind the Compose `s3` profile, so default `docker compose up -d` does NOT start Garage. Operators who want self-hosted S3 run `docker compose --profile s3 up -d` explicitly.

The service SHALL:

- Use a pinned Garage image tag (not `latest`).
- Mount a committed TOML config from `./infra/garage/garage.toml` at `/etc/garage.toml` read-only.
- Persist metadata under the `garage_meta` named volume and blobs under the `garage_data` named volume.
- Both volumes SHALL be declared `external: true` (matching the `postgres_data` pattern) so `docker compose down -v` cannot remove them.
- Use `restart: unless-stopped` — same policy as the other production containers.
- Expose a healthcheck against Garage's admin API (`/health` on `:3903`).
- Attach to the existing `proxy` network; no host-port publishing by default.

#### Scenario: Default `docker compose up` doesn't start Garage

- GIVEN the operator runs `docker compose up -d` WITHOUT `--profile s3`
- WHEN `docker compose ps` is inspected
- THEN the `garage` service SHALL NOT be listed
- AND no Garage-related volumes SHALL be created

#### Scenario: Opting in brings Garage up

- GIVEN the operator runs `docker compose --profile s3 up -d`
- WHEN `docker compose ps` is inspected
- THEN the `garage` service SHALL be listed as running
- AND `garage_meta` and `garage_data` volumes SHALL exist
- AND the backend container SHALL be able to reach `http://garage:3900` on the `proxy` network

### Requirement: `make s3-init` SHALL bootstrap the bucket and key idempotently

The repo SHALL provide a `make s3-init` target that prepares a running Garage instance for backend use. The target SHALL:

- Verify the `garage` service is running (and exit with a clear message if not).
- Create the bucket named by `$S3_BUCKET_NAME` if it doesn't exist.
- Create an access key identified by `$S3_ACCESS_KEY_ID` with secret `$S3_SECRET_ACCESS_KEY` if it doesn't exist.
- Grant that key read-write permissions on the bucket.
- Be safe to run repeatedly — re-running on an already-bootstrapped instance SHALL exit `0` without duplicating resources or erroring.

#### Scenario: Fresh bootstrap

- GIVEN a freshly-started Garage service with an empty metadata store
- WHEN the operator runs `make s3-init` with a fully-populated `.env`
- THEN the target SHALL create the bucket and the key
- AND SHALL exit `0`
- AND uploads from the backend SHALL succeed immediately afterwards

#### Scenario: Rerun is a no-op

- GIVEN `make s3-init` has already run successfully
- WHEN it is run again
- THEN the target SHALL detect the existing bucket and key
- AND SHALL NOT raise an error
- AND SHALL exit `0`

#### Scenario: Garage is not running

- GIVEN `docker compose --profile s3 ps garage` shows no running container
- WHEN the operator runs `make s3-init`
- THEN the target SHALL exit non-zero with a message instructing them to start Garage first
- AND SHALL NOT modify anything

### Requirement: Operators MAY expose Garage through Traefik

When `S3_TRAEFIK_ENABLED=true`, the `garage` service SHALL get Traefik labels so the bucket is reachable at `https://s3.${DOMAIN}` (or an equivalent subdomain). When the flag is unset or false, the Traefik labels SHALL have no effect and Garage SHALL remain reachable only inside the Docker network.

This flag is independent from the backend's `S3_ENDPOINT_URL` / `S3_PUBLIC_ENDPOINT_URL` split — operators with an external load balancer or bare-metal DNS SHALL be free to leave Traefik out and point the backend at whichever URL their infrastructure exposes.

#### Scenario: Traefik route active

- GIVEN `S3_TRAEFIK_ENABLED=true` and a DNS entry for `s3.example.com` pointing at the host
- WHEN the operator loads a page that includes a pet profile picture
- THEN the `<img src>` URL SHALL start with `https://s3.example.com/`
- AND the browser SHALL load the image directly from Garage via Traefik

#### Scenario: Traefik route off

- GIVEN `S3_TRAEFIK_ENABLED` is unset
- WHEN the `s3` profile is up
- THEN `s3.${DOMAIN}` SHALL NOT be routed by Traefik
- AND the backend SHALL still work internally via the Compose DNS name `garage`

### Requirement: Garage volumes SHALL follow the external-volume convention

`garage_meta` and `garage_data` SHALL be declared with `external: true` and a fixed name (`happy-calendar_garage_meta`, `happy-calendar_garage_data`) in `docker-compose.yml`. The `make volume-ensure-s3` target SHALL create them idempotently on first `up`.

#### Scenario: `make clean` doesn't drop S3 data

- GIVEN the `s3` profile has been up and uploads have been written
- WHEN the operator runs `make clean` (which calls `docker compose down --remove-orphans`)
- THEN the `garage_meta` and `garage_data` volumes SHALL still exist
- AND the next `docker compose --profile s3 up -d` SHALL resume from the same data without re-bootstrap
