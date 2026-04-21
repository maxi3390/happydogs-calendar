# Tasks

## 1. Compose file
- [x] 1.1 In `docker-compose.yml` top-level `volumes:` block, change `postgres_data:` to `postgres_data:\n  external: true\n  name: happy-calendar_postgres_data`.
- [x] 1.2 Leave `traefik-certs:` unchanged (no durability requirement on ACME cache).

## 2. Makefile
- [x] 2.1 Define `POSTGRES_VOLUME_NAME := happy-calendar_postgres_data`.
- [x] 2.2 Add a private `volume-ensure` target that runs `docker volume create $(POSTGRES_VOLUME_NAME) >/dev/null`.
- [x] 2.3 Make `up`, `init`, `upgrade`, `backup`, `restore` depend on `volume-ensure` so first-run invocations auto-provision the volume.
- [x] 2.4 Drop `-v` from the `clean` target (now reads `docker compose down --remove-orphans`).
- [x] 2.5 Add `destroy-db` target that confirms (`yes` on TTY or `RESTORE_I_UNDERSTAND=yes` non-interactively), stops containers via `docker compose down`, and removes the volume via `docker volume rm $(POSTGRES_VOLUME_NAME)`.
- [x] 2.6 Add `volume-ensure` and `destroy-db` to `.PHONY`.
- [x] 2.7 Update `make help`: change the `make clean` description to reflect the new behavior; add a `make destroy-db` entry under Maintenance.

## 3. Spec
- [x] 3.1 Create baseline `openspec/specs/tooling/database-persistence/spec.md` with three requirements: external volume persistence, auto-provision on first use, safe clean + explicit destroy-db.
- [x] 3.2 Mirror the content as ADDED in `openspec/changes/persistent-db-volume/specs/tooling/database-persistence/spec.md`.

## 4. Documentation
- [x] 4.1 `AGENTS.md` Makefile table: update the `make clean` row and add a `make destroy-db` row.
- [x] 4.2 `AGENTS.md`: add a short "Database persistence" section below the Database backup and restore section, explaining the three-layer model (backups, external volume, explicit destroy).

## 5. Verification
- [x] 5.1 With the branch applied: delete all containers and run `docker compose down -v`. The `happy-calendar_postgres_data` volume SHALL still exist (`docker volume ls` shows it).
- [x] 5.2 `make up` on a host without the volume creates it (simulate: `docker volume rm happy-calendar_postgres_data` then `make up`, expecting a clean start with a fresh empty volume).
- [x] 5.3 `make clean` stops containers but preserves the volume.
- [x] 5.4 `make destroy-db` without confirmation refuses; with `RESTORE_I_UNDERSTAND=yes` removes the volume.
- [x] 5.5 `make backup` and `make restore` still round-trip correctly post-change.
- [x] 5.6 Backend tests remain 222/222.
