# Proposal: Add `make upgrade` Action

## Intent

Upgrading a running instance of the system currently requires several manual steps in the right order: pulling the latest code, rebuilding Docker images, restarting services, and running pending database migrations. Developers and operators routinely forget one of those steps (typically migrations), which leaves the system in an inconsistent state. A single `make upgrade` command collapses the full upgrade flow into one reproducible action.

## Scope

In scope:
- New `make upgrade` target that performs, in order:
  1. `git pull` to fetch the latest code from the current branch's upstream
  2. `docker compose build` to rebuild images with the new code (Docker's layer cache skips unchanged layers)
  3. `docker compose up -d` to recreate containers whose image changed
  4. `docker compose exec backend python manage.py migrate` to apply any pending migrations
- Help text entry in the existing `make help` listing
- Progress messages between each step so the operator can see what's happening
- Entry in `.PHONY`
- Documentation update in root `CONTEXT.md` Makefile commands table

Out of scope:
- Rollback / downgrade flow
- Zero-downtime upgrade (current restart causes brief interruption)
- Frontend build-time environment variable injection (already handled by the existing frontend Dockerfile)
- Automated backup before upgrade (separate concern, tracked as a follow-up)
- Frontend E2E or backend tests as part of the upgrade (operator can run `make test` separately)

## Approach

The target reuses existing Makefile targets rather than duplicating commands. `make upgrade` becomes a short recipe that calls `$(MAKE) build`, `$(MAKE) up`, and `$(MAKE) migrate` in sequence, with a `git pull` before the build step. Each step prints a clear header so the operator can see progression. If any step fails, `make` stops and surfaces the error — no complex error handling needed.

The target is idempotent within limits: running it when there are no new commits is fine (git pull is a no-op, build uses cache, up is a no-op on unchanged containers, migrate is a no-op when no migrations pending).
