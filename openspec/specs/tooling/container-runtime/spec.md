# Tooling: Container Runtime Specification

## Purpose

Make the container images safe and appropriate to run in production while keeping the local developer experience (hot-reload, dev toolchain) intact. The production images run a real WSGI server as a non-root user with runtime dependencies only; the dev-only wiring (source bind-mount, `runserver`, insecure reverse-proxy dashboard) lives in `docker-compose.override.yml`, which `docker compose` merges automatically for local use but a production deploy omits.

## Requirements

### Requirement: The backend SHALL run under a production WSGI server

The production backend image SHALL serve the application via `gunicorn`
(`nursery.wsgi:application`), not Django's `runserver`. `runserver` MAY be used
only in the dev stack, wired via `docker-compose.override.yml`.

#### Scenario: Production image serves via gunicorn

- GIVEN the backend image built with its default (`prod`) target
- WHEN the container starts
- THEN the serving process SHALL be `gunicorn`, not `manage.py runserver`

#### Scenario: Dev stack still hot-reloads

- GIVEN a local `docker compose up` (base + override merged)
- WHEN a source file under `backend/` changes
- THEN the running dev server SHALL pick up the change without a rebuild

### Requirement: Application containers SHALL run as a non-root user

The backend and docs images SHALL define a non-root `USER`, matching the
existing frontend image convention. No application container SHALL run its main
process as uid 0.

#### Scenario: Backend process is non-root

- WHEN `docker compose exec backend id -u` is run
- THEN it SHALL report a non-zero uid

#### Scenario: Docs process is non-root

- WHEN the docs container is running
- THEN its main process SHALL NOT run as root

### Requirement: The runtime image SHALL exclude development-only dependencies

The default (production) backend image SHALL install `requirements.txt` only.
`requirements-dev.txt` (linters, security scanners, formatters) SHALL be
present only in the `dev` build stage used by CI and the dev stack.

#### Scenario: Prod image lacks dev tooling

- GIVEN the backend image built with its default target
- WHEN one inspects installed packages
- THEN `flake8`, `bandit`, `black`, and `isort` SHALL NOT be present

### Requirement: Build context SHALL be minimised via `.dockerignore`

`backend/` and `docs/` SHALL each provide a `.dockerignore` that excludes at
least `.git`, `__pycache__`, `*.pyc`, `.pytest_cache`, `.coverage`, `media/`,
`staticfiles/`, and `.env*`.

#### Scenario: Local `.env` is never copied into an image layer

- GIVEN a developer with a local `backend/.env`
- WHEN the backend image is built
- THEN the `.env` file SHALL NOT be included in the build context or any layer

### Requirement: Database migrations SHALL NOT run implicitly on every container start in production

The base (production) compose SHALL NOT run `migrate` as part of a
long-running container's start command. Migrations SHALL be applied as an
explicit, single-runner step (`make migrate` or a one-shot init container).
The dev override MAY keep an inline `migrate` for single-replica convenience.

#### Scenario: Multiple backend replicas do not race migrations

- GIVEN a production deployment scaling the backend to more than one replica
- WHEN the replicas start
- THEN no replica's start command SHALL invoke `migrate`, and schema changes
  SHALL be applied by the dedicated migration step instead

### Requirement: The insecure reverse-proxy dashboard SHALL be dev-only

The base `docker-compose.yml` SHALL NOT enable the Traefik API dashboard
(`--api.insecure=true` / `--api.dashboard=true`) nor publish its `:8080`
entrypoint. These SHALL be provided only by the dev-only
`docker-compose.override.yml`.

#### Scenario: Base compose does not expose the dashboard

- GIVEN a deployment using only `docker-compose.yml` (no override)
- WHEN the stack is running
- THEN port 8080 SHALL NOT be published and the insecure dashboard SHALL be off
