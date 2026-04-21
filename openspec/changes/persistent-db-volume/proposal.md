# Proposal: Make The Postgres Volume External So The Database Persists Across Changes

## Intent

`docker compose down -v --remove-orphans` is `make clean`'s implementation today. Running it — directly or through `make clean` — destroys the `postgres_data` volume and every owner, pet, schedule, user, vaccination, and setting it contained. Named volumes inside the `docker-compose.yml` file are considered part of the project and go away with `-v`. This makes the database surprisingly fragile for a line of commands that looks like routine cleanup. Promote the volume to an external Docker resource with a stable name so compose can't delete it, auto-provision it from the Makefile targets that start the stack, and require an explicit, confirmation-gated target to destroy it. Combined with the earlier `make backup` / `make restore` and `make upgrade` work, this gives the database three levels of durability: nightly (or pre-upgrade) snapshots in `backups/`, an external volume that survives compose cleanup, and a clearly-labelled one-way nuclear switch.

## Scope

In scope:
- Introduce a new tooling capability `openspec/specs/tooling/database-persistence/` that codifies the durability contract.
- `docker-compose.yml`: change the `postgres_data` volume declaration to `external: true` with a fixed `name:` so the volume exists independently of the compose project and cannot be removed by `docker compose down -v` or `make clean`.
- `Makefile`: add a private `volume-ensure` target that runs `docker volume create $(POSTGRES_VOLUME_NAME)` idempotently. Wire it as a prerequisite of every target that brings containers up or shells into the `db` service: `up`, `init`, `upgrade`, `backup`, `restore`.
- `Makefile`: remove the `-v` from the `clean` target so `make clean` stops and removes only containers, leaving volumes (including `postgres_data` even if it were internal) alone. The external declaration makes this defense-in-depth, but the change keeps the target's behavior self-documenting.
- `Makefile`: add a `destroy-db` target that explicitly removes the `postgres_data` volume, guarded by the same yes/`RESTORE_I_UNDERSTAND=yes` confirmation pattern used by `make restore`. Update `make help`.
- `AGENTS.md`: update the Makefile table to reflect the new command and the new `clean` behavior, and add a short "Database persistence" subsection.

Out of scope:
- Moving the database storage to a bind mount (host-directory) rather than a Docker volume. Bind mounts introduce per-platform permission issues (macOS vs Linux vs WSL) and expose the data outside Docker's governance. An external named volume keeps the data inside Docker while still surviving `compose down -v`.
- Automatic pre-destroy backups in `make destroy-db`. The operator already has `make backup` and the script prompt names the operation explicitly; coupling them would surprise operators who invoked `destroy-db` intentionally.
- Changes to the backup/restore scripts themselves. They continue to work unchanged; the only adjustment is that `volume-ensure` ensures the volume exists before they try to start the `db` container.
- Changes to production deployment playbooks beyond what the compose file encodes; operators running this stack somewhere else get the same guarantees purely through the compose declaration.

## Approach

- **External volume with fixed name**: change the compose declaration from

  ```yaml
  volumes:
    postgres_data:
    traefik-certs:
  ```

  to

  ```yaml
  volumes:
    postgres_data:
      external: true
      name: happy-calendar_postgres_data
    traefik-certs:
  ```

  The `name:` field pins the Docker volume name regardless of the compose project name, so renaming the cloned directory doesn't orphan the data. External volumes are never removed by `docker compose down -v` — this is the primary durability guarantee.

- **Auto-provision with `volume-ensure`**: external volumes must exist before `docker compose up` can attach to them. A new private Makefile target runs `docker volume create happy-calendar_postgres_data`, which is a documented no-op when the volume exists. Because the target is a prerequisite of `up`, `init`, `upgrade`, `backup`, and `restore`, every user-facing command that would need the volume ensures it exists transparently.

- **Defence-in-depth on `make clean`**: removing the `-v` flag from `docker compose down -v --remove-orphans` is technically redundant once `postgres_data` is external (compose can no longer remove it), but the target's name is suggestive enough that operators might read its recipe and assume `-v` is safe. Keeping the two protections in the same change makes both the declaration and the target self-consistent.

- **Explicit destruction target**: `make destroy-db` is the only Makefile path to remove the volume. It:
  1. Prints exactly what it is about to remove.
  2. Requires `yes` typed at a TTY (or `RESTORE_I_UNDERSTAND=yes` for non-interactive use, matching the `make restore` convention).
  3. Runs `docker compose down` so the `db` container releases its lock on the volume.
  4. Runs `docker volume rm happy-calendar_postgres_data`.

  Operators who want to start over follow up with `make init` or `make up`, which will recreate the empty volume via `volume-ensure`.

- **Spec**: a new capability `tooling/database-persistence` with requirements for (a) the external volume invariant, (b) the auto-provisioning behavior of `volume-ensure`, (c) the `make clean` safe-for-data guarantee, and (d) the `make destroy-db` contract. The `tooling/upgrade` and `tooling/backup` specs aren't modified — they already describe their respective responsibilities, and this change just makes their assumptions about a persistent `db` service hold durably under stress.

- **Docs**: `AGENTS.md` gains an updated Makefile table row for `make clean` (now "stop services, keep volumes") and a new row for `make destroy-db`. A short "Database persistence" section explains the three-layer durability model (backups, external volume, explicit destroy).
