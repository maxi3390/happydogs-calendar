# Design: Full Database Backup/Restore + Automatic Pre-Upgrade Snapshot

## Context

The stack stores everything that matters (owners, pets, schedules, users, vaccinations, settings) in PostgreSQL. Upgrades can apply destructive migrations — field drops, data rewrites — and while those are tested in the backend test suite, operators want a durable net that doesn't depend on test coverage. Today they'd run `docker compose exec db pg_dump …` by hand and save the output somewhere. That works, but it's tribal, easy to forget, and doesn't integrate with `make upgrade` which is the documented path for deployments.

This change turns that into a first-class workflow.

## Decisions

### 1. Plain SQL + gzip, not `pg_dump -Fc`

`pg_dump` offers two main formats:

- **Plain SQL** (`-Fp`, the default): a `.sql` file of `CREATE TABLE` / `INSERT` / etc. statements. Restoration uses `psql < file.sql`. Portable across PostgreSQL versions with caveats, human-readable with `less`, easy to eyeball in an emergency.
- **Custom format** (`-Fc`): a binary archive. Restoration requires `pg_restore` which supports parallel jobs and selective table restore. Smaller than plain SQL before gzip.

Decision: plain SQL, gzipped via shell pipe. The reasons:

- The restore pipeline becomes one line of shell (`gunzip -c file.sql.gz | psql`), no `pg_restore` invocation subtleties.
- Compressed plain SQL is roughly as compact as `-Fc` for datasets this size.
- Plain SQL inspects cleanly with `zcat`/`less` if an operator needs to audit what will happen before restoring.
- We don't need parallel restore for a nursery-scale database.

### 2. `docker compose exec -T db` for both pg_dump and psql

The scripts run against the `db` service using compose's `exec`. Benefits:

- Works identically whether the stack is local development or a deployed instance using the same compose file.
- No need to install `pg_dump`/`psql` on the operator's host.
- The connection uses `POSTGRES_USER` / `POSTGRES_DB` that the container already has baked in.

`-T` disables pseudo-TTY allocation; without it, piping stdin/stdout (for `gunzip -c | psql`) breaks in non-interactive shells.

Alternative considered: spin up a throwaway `postgres:16-alpine` sidecar container that runs the dump. Rejected — adds a hop and depends on network plumbing. Using the existing db container is simpler.

### 3. Timestamped filenames

Format: `nursery-YYYY-MM-DD-HHMMSS.sql.gz`.

- Lexicographic sort matches chronological sort, so `ls -t` and glob expansion both produce sane ordering.
- The `nursery-` prefix namespaces the files in case operators store other things in `backups/`.
- Seconds granularity avoids collisions when backups are taken in quick succession (e.g. two `make upgrade` runs in the same minute).

Alternative considered: use the local PostgreSQL binary format with version embedded (`nursery-pg16-…`). Rejected — we control the PostgreSQL version via compose and don't need to support cross-version restore in this change's scope.

### 4. Safety-first restore

The restore script is the only destructive operation in this change. It:

1. Resolves the target backup — explicit via `BACKUP_FILE=path` (or positional arg), or the most recently modified file in `backups/`.
2. Sanity-checks that the file exists and is non-empty.
3. Prompts for explicit `yes` confirmation on a TTY, OR requires `RESTORE_I_UNDERSTAND=yes` environment variable for non-interactive runs.
4. Drops the database with `DROP DATABASE IF EXISTS "$POSTGRES_DB" WITH (FORCE)`, which terminates active backend connections (PostgreSQL 13+; PG16 is what we run).
5. Recreates an empty database with the original owner.
6. Pipes `gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"`.

The `FORCE` option is important: if the backend is running, it holds connections to the database, which would block a plain `DROP DATABASE`. `FORCE` asks PostgreSQL to terminate those sessions first. Backend containers will reconnect automatically when their next request comes in.

Alternative considered: stop the backend container before restoring, then start it again. Rejected — adds two compose-level side effects and failure modes. `FORCE` is built for exactly this case.

### 5. Upgrade integration: backup is step 1 of 5

New `upgrade` sequence:

```
[1/5] Backing up database
[2/5] Pulling latest code
[3/5] Rebuilding images
[4/5] Restarting services
[5/5] Running migrations
```

If `make backup` exits non-zero (e.g. db container unreachable, disk full), the sub-make return propagates and the entire `upgrade` halts before any mutating step. Operators still have a clean stack and know exactly what went wrong from the error output.

**Opt-out**: setting `SKIP_BACKUP=1 make upgrade` skips step 1 with a warning. Use cases: redeploying immediately after a known-good backup was already taken; CI/CD pipelines that run their own backup pre-step; development machines where losing data is acceptable.

### 6. Scripts start the db container before acting

A fresh clone or a cold stack might have no containers running. Rather than fail with an opaque `cannot exec` message, both scripts `docker compose up -d db` (idempotent) and then wait up to 30 seconds for `pg_isready`. If it doesn't become ready, the script aborts with a clear error.

This also means `make backup` can be run standalone on a freshly-cloned repo to check the backup pipeline works without having to bring up the full stack.

### 7. `.env` sourcing for customized Postgres vars

`scripts/backup-db.sh` and `scripts/restore-db.sh` source `.env` if it exists, then fall back to defaults matching `docker-compose.yml` (`nursery` for db, user, password). This way a deployer who customized `POSTGRES_DB=happydb` in their `.env` doesn't have to edit the scripts.

### 8. Gitignore

`backups/` stays tracked via `.gitkeep` so the directory is present after clone. `backups/*.sql` and `backups/*.sql.gz` are gitignored so actual dumps never land in the repository.

## Risks / Trade-offs

- **`DROP DATABASE … WITH (FORCE)`** is PostgreSQL ≥13. The compose file pins `postgres:16-alpine`, so this works today. If the project ever downgrades PostgreSQL, the restore script would need an alternative (revoke + pg_terminate_backend).
- **Backup I/O**: a large DB produces a large dump. `pg_dump` streams, so memory isn't an issue, but disk space is. Operators with limited disk should prune old backups manually. The scripts don't rotate.
- **No validation** that the dump is consistent (beyond `pg_dump` itself). A corrupted dump would only fail at restore time. Given `pg_dump` is a trusted PostgreSQL tool, we accept the risk.
- **Skipping the backup**: `SKIP_BACKUP=1` defeats the safety net by design. Documented in both the Makefile output and the spec.
- **Media files**: this change snapshots only the database. Pet avatars and documents stored under `backend/media/` are not part of the dump. A user who restores after accidentally deleting a pet will get the database row back but the uploaded file remains (because files are in a docker volume/host directory, not the DB). Out of scope for this change, and no additional risk is introduced — operators already had this gap.
