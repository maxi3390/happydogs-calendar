# Design — Backend production runtime

## Multi-stage layout

```dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client && rm -rf /var/lib/apt/lists/*

FROM base AS dev
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
# dev command is supplied by docker-compose.override.yml (runserver)

FROM base AS prod
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN adduser --system --no-create-home --uid 1001 appuser \
    && chown -R appuser /app
USER appuser
EXPOSE 8000
CMD ["gunicorn", "nursery.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

`docker build` defaults to the last stage (`prod`). Compose selects `dev` via
`build.target` in the override file.

## Why the dev/prod split lives in compose, not the Dockerfile

The image should be immutable and identical across environments; only the
*runtime wiring* differs. So the bind-mount, the `runserver` command, and the
`target: dev` selector live in `docker-compose.override.yml` (which Compose
merges automatically for local `docker compose up`), while the base
`docker-compose.yml` describes the production shape. This mirrors the existing
convention already hinted at by `.gitignore` ignoring
`docker-compose.override.yml`.

## Migrations

Running `migrate` inside every container's start command races when more than
one backend replica boots. Production runs migrations as a discrete step
(`make migrate`, or a one-shot init container that exits 0). Dev keeps the
convenient inline `migrate && runserver` in the override because there is only
ever one replica locally.

## Non-root and file ownership

`gunicorn` needs to read the app tree and write nothing under `/app` at
runtime (uploads go to `MEDIA_ROOT`, which in production is object storage or a
mounted volume owned appropriately). Creating `appuser` with uid 1001 matches
the frontend image's convention and keeps host-volume ownership predictable.

## `.dockerignore`

Excludes `.git`, `__pycache__`, `*.pyc`, `.pytest_cache`, `.coverage`,
`htmlcov`, `media/`, `staticfiles/`, `.env*`. Shrinks context, speeds builds,
and avoids leaking a local `.env` into an image layer.

## Verification

`docker build --target prod ./backend` succeeds; the resulting container serves
via gunicorn and runs as uid 1001 (`docker compose exec backend id` shows
non-root). `make up` (which merges the override) still hot-reloads via
`runserver`. `make test-backend` unaffected (tests run against the dev stage).
