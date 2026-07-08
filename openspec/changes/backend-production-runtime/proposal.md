# Backend production runtime (gunicorn, non-root, slim image)

## Why

The backend image is not safe or appropriate to run in production as built:

- **Dev server in prod.** `backend/Dockerfile`'s `CMD` runs
  `python manage.py runserver 0.0.0.0:8000`. Django explicitly documents
  `runserver` as unsuitable for production (single-threaded, no process
  supervision, insecure static handling). `gunicorn` is already listed in
  `requirements.txt` but never invoked.
- **Runs as root.** The image defines no `USER`, so the process runs as root.
  `frontend/Dockerfile` already drops to a `nextjs` user; backend and docs do
  not. A container breakout or RCE therefore lands as root.
- **Dev tooling in the runtime image.** The Dockerfile installs
  `requirements-dev.txt` (flake8, black, isort, bandit, pip-audit), bloating
  the image and enlarging the attack surface with tools that have no business
  in production.
- **Source bind-mount and migrate-on-start baked into the base compose.** The
  base `docker-compose.yml` mounts `./backend:/app` and runs
  `migrate && runserver` inline — appropriate for dev hot-reload, wrong for an
  immutable production deployment.

## What

1. **Multi-stage `backend/Dockerfile`:**
   - `base` stage: `python:3.12-slim` + runtime OS deps (`postgresql-client`).
   - `prod` (default target): install `requirements.txt` only; create and
     switch to a non-root user; `CMD ["gunicorn", "nursery.wsgi:application",
     "--bind", "0.0.0.0:8000", "--workers", "3"]`.
   - `dev` stage: extends base with `requirements-dev.txt` for use by CI/lint
     and the dev compose.
2. **`docs/Dockerfile`:** add a non-root `USER` (parity with frontend).
3. **`docker-compose.override.yml` (dev):** carry the `./backend:/app`
   bind-mount, the `migrate && runserver` command, and `target: dev` build
   arg. The base compose becomes production-shaped (no bind-mount, gunicorn
   entrypoint, migrations run as an explicit step / init).
4. **`.dockerignore`** for `backend/` and `docs/` so build context excludes
   `.git`, `__pycache__`, `.pytest_cache`, `media/`, `.env`, etc.
5. **Migrations on deploy:** documented as an explicit `make migrate` (or an
   init container) rather than implicit on every container start, so N replicas
   don't race the migrator.

## Impact

- `backend/Dockerfile` rewritten as multi-stage (~15 lines).
- `docs/Dockerfile` gains a non-root user.
- New `docker-compose.override.yml`; base `docker-compose.yml` trimmed of dev-only bits.
- New `backend/.dockerignore`, `docs/.dockerignore`.
- No application code change.

## Out of scope

- Choosing/rolling an ASGI stack (uvicorn/gunicorn workers tuning beyond a sane
  default worker count).
- Static-file serving strategy (WhiteNoise vs Traefik) — tracked separately.
- Kubernetes manifests / Helm.
