# Design: Make The Postgres Volume External So The Database Persists Across Changes

## Context

Three observations motivated this change:

1. The database lives in a Docker volume named `postgres_data`, declared inside `docker-compose.yml` under the top-level `volumes:` block. Compose considers it a "project-local" resource, so `docker compose down -v` removes it along with any anonymous volumes.
2. `make clean` today runs `docker compose down -v --remove-orphans`, which wipes the database. Many operators read `clean` as "remove containers" (analogous to `git clean`), not "remove data"; the flag is easy to forget.
3. Earlier work introduced `make backup` and wired it into `make upgrade` as a pre-upgrade snapshot. Snapshots are a recovery tool; durable storage is a separate concern. Even with perfect snapshots, a bad `docker compose down -v` between backups means real data loss.

Solving this well means making the volume harder to destroy — not impossible, but intentional.

## Decisions

### 1. External volume, pinned name

Compose's `external: true` on a named volume tells Docker Compose "this volume exists outside the project; don't create it, don't remove it." The volume must be created with `docker volume create` (or already exist when Compose tries to attach).

We pair it with `name: happy-calendar_postgres_data`, which pins the Docker-level name regardless of the compose project name. If someone clones the repo into `nursery/` or `happy-dogs/`, the volume is still addressable as `happy-calendar_postgres_data`, so a backup/restore cycle works across working directories.

Alternatives considered:

- **Bind mount to a host directory**: simpler to inspect ("it's a folder"), but pulls the data into the host filesystem with all the per-platform permission trade-offs (PostgreSQL's uid 999 inside the container vs the operator's uid outside it; macOS osxfs quirks; WSL bind-mount latency). Docker-managed volumes sidestep all of this.
- **Leave the volume project-local, remove `-v` from `make clean`**: doesn't defend against someone running raw `docker compose down -v` from a terminal. External is belt-and-suspenders.

### 2. `volume-ensure` as a private prerequisite

External volumes don't auto-provision. A fresh clone attempting `make up` would see:

```
Error response from daemon: No such volume: happy-calendar_postgres_data
```

That's a poor first-run experience. A tiny make target fixes it:

```
POSTGRES_VOLUME_NAME := happy-calendar_postgres_data

volume-ensure:
	@docker volume create $(POSTGRES_VOLUME_NAME) >/dev/null
```

`docker volume create` is idempotent: on a repo that already has the volume, the command is a no-op and prints the name. On a fresh clone it creates an empty Docker-managed volume. Wire this as a prerequisite of every target that brings the stack up or shells into the db service: `up`, `init`, `upgrade`, `backup`, `restore`.

Alternative considered: a one-time `make bootstrap` target that the operator runs manually the first time. Rejected — any target that can fail on a fresh clone should self-heal, because the failure mode (opaque Docker error) is worse than a harmless extra second of `docker volume create`.

### 3. Drop `-v` from `make clean`

Once `postgres_data` is external, `docker compose down -v` leaves it untouched. But the current recipe reads:

```
clean:
	docker compose down -v --remove-orphans
```

That still looks like "remove all volumes" to a reader. We drop the `-v` so the recipe reads `docker compose down --remove-orphans`, which matches what the target actually does now. Anonymous volumes from any service get removed when their container is removed anyway; `--remove-orphans` keeps its purpose of cleaning up services that were once declared but aren't any more.

### 4. `make destroy-db` for intentional wipes

A one-way nuclear switch with the same safety rails as `make restore`:

- Prompts on a TTY for `yes`; non-interactive runs need `RESTORE_I_UNDERSTAND=yes`.
- Brings containers down (so the db container releases its lock on the volume) via `docker compose down`.
- Removes the volume with `docker volume rm happy-calendar_postgres_data`.
- On the next `make up`, `volume-ensure` provisions a fresh empty volume.

Alternative considered: auto-backup before destroy. Rejected — operators who invoke destroy-db intentionally (e.g. resetting a local dev environment) don't want a compensating backup. Operators who want a backup first can run `make backup && make destroy-db`. The target stays simple and predictable.

The name `destroy-db` was chosen over `wipe-db` / `clean-db` / `nuke-db` because:

- It pairs semantically with `make backup` / `make restore` (all three operate on the database layer).
- The verb "destroy" matches the level of explicitness we want for an irreversible op.
- It doesn't collide with any existing target name.

### 5. Spec carving

A new capability `tooling/database-persistence`. The existing `tooling/backup` and `tooling/upgrade` specs aren't modified — they already assume the database is there; this change makes that assumption hold.

Three requirements in the new spec:

- **Postgres volume is external and persistent**: compose declares the volume as external with a fixed name; `docker compose down -v` is a no-op against it.
- **`volume-ensure` auto-provisions on first run**: `make up` / `init` / `upgrade` / `backup` / `restore` all depend on it; a fresh clone can run `make init` without manually creating volumes.
- **`make clean` is safe-for-data; `make destroy-db` is explicitly destructive**: clean stops containers, keeps volumes; destroy-db requires confirmation and only then removes the volume.

### 6. Non-Linux considerations

Docker-managed named volumes live inside the Docker VM on macOS / WSL2. Nothing about the change affects that. Operators running `docker volume rm` get the same behavior on every platform. Fine.

## Risks / Trade-offs

- **Fresh-clone users must use `make up` / `make init`** rather than raw `docker compose up -d`. If they skip the Makefile, they hit the "No such volume" error. Mitigation: the error message itself suggests the fix; AGENTS.md points to `make up`.
- **Operators who previously relied on `make clean` to reset their dev DB** now need `make destroy-db`. Behavior is documented, and the new target has the same safety rails as `make restore`, which these operators have already accepted.
- **`docker volume create` race** when parallel `make` invocations happen concurrently is theoretical: the command is atomic on the Docker daemon. Not a real concern.
- **Existing users with a project-local `happy-calendar_postgres_data` volume** (created by `docker compose up` before this change) already have a volume with that exact name, because compose defaults a project-local name to `<project>_<volumename>` and the project is `happy-calendar`. The external declaration adopts that same volume on first post-merge `make up`, with no data loss. If by chance someone's project name differs (custom `COMPOSE_PROJECT_NAME`), they'd need to rename or migrate; noted in the proposal, not expected in practice.
