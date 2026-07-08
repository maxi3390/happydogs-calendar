# Tasks — Backend production runtime

## Phase 1 — Dockerfiles

- [x] Rewrite `backend/Dockerfile` as multi-stage (`base` / `dev` / `prod`);
      default target `prod` uses `requirements.txt` only, a non-root `appuser`
      (uid 1001), and a `gunicorn` entrypoint.
- [x] Add a non-root `USER node` to `docs/Dockerfile` (chown /app first).
- [x] Add `backend/.dockerignore` and `docs/.dockerignore`.

## Phase 2 — Compose split

- [x] Create `docker-compose.override.yml` (dev) carrying: `build.target: dev`,
      the `./backend:/app` bind-mount, and the `migrate && runserver` command
      for `backend` + `notification-cron`, plus the insecure Traefik dashboard
      (:8080) that the base file no longer exposes.
- [x] Trim the base `docker-compose.yml` so it is production-shaped: no
      bind-mount, gunicorn entrypoint (image default), migrations not run
      inline on start, no dashboard.
- [x] Decision: `docker-compose.override.yml` is now a TRACKED dev override
      (un-ignored in `.gitignore`); personal machine-specific tweaks use an
      untracked `docker-compose.local.yml` instead. Production deploys with
      `docker compose -f docker-compose.yml up` (documented in the override
      header).

## Phase 3 — Migrations on deploy

- [x] Document the explicit `make migrate` deploy step in
      `docs/docs/deployment.md`.

## Phase 4 — Verify

- [x] `docker build --target prod ./backend` succeeds.
- [x] Prod container serves via gunicorn (`--check-config` OK) and reports
      uid 1001 (non-root); dev tooling (flake8/bandit) absent from the image.
- [x] `dev` target builds, has the toolchain, runs as root (bind-mount safe).
- [x] Both compose configs validate (`docker compose config` for dev-merged
      and `-f docker-compose.yml` for prod-only). `make up`/`make test-backend`
      unchanged (dev override auto-merges). Full `make up` not run here: the
      local dev DB volume is on a stale pre-Postgres-18 layout (environment
      issue, unrelated to this change).

## Phase 5 — Spec + archive

- [x] Promote `specs/tooling/container-runtime/spec.md` into the live
      `openspec/specs/tooling/container-runtime/` capability (incl. the
      dev-only Traefik dashboard requirement inherited from harden-settings).
- [x] `docs/docs/deployment.md` updated (dev vs prod invocation, migrate step).
- [ ] Archive this change folder (deferred until merge).
