# Proposal: Full Database Backup/Restore + Automatic Pre-Upgrade Snapshot

## Intent

`make upgrade` currently pulls new code, rebuilds images, restarts the stack, and applies Django migrations. Migrations in particular can be destructive (field removals, data migrations). There's no operator-side net: if a migration corrupts data or a post-upgrade defect surfaces, the only recovery path today is manual `pg_dump`/`pg_restore` invocation against the live container. Add first-class `make backup` and `make restore` commands that wrap `pg_dump` / `psql` for the PostgreSQL service, and wire `make backup` into `make upgrade` as the first step so every upgrade produces a rollbackable snapshot automatically.

## Scope

In scope:
- Introduce a new tooling capability `openspec/specs/tooling/backup/` that defines the contract for on-demand backups and restores.
- Add `scripts/backup-db.sh` — a bash script that produces a full, timestamped, gzipped SQL dump of the PostgreSQL database into `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz`.
- Add `scripts/restore-db.sh` — a bash script that restores the database from a named backup file (or the latest when none is specified). Requires explicit confirmation because the operation is destructive (drops and recreates the database).
- Add `make backup` and `make restore` Makefile targets that invoke the scripts. Update `make help` and `.PHONY`.
- Make `make upgrade` run `make backup` as its first step (before `git pull`, `build`, `up`, `migrate`), so every upgrade has a known-good pre-upgrade snapshot. Failure of the backup halts the upgrade.
- Create `backups/` at the repository root with a `.gitkeep` sentinel, and gitignore the dump files so snapshots don't pollute the repository.
- Update the existing `tooling/upgrade` spec to reflect the new first step and the invariant that the upgrade halts if the backup fails.
- Update `AGENTS.md` Makefile table and add a short "Database backup and restore" note.

Out of scope:
- Off-site or automated scheduled backups. `make backup` is an on-demand local snapshot; shipping dumps to cloud storage is a separate infrastructure concern.
- Point-in-time recovery (WAL archiving). Users who want PITR should layer that on PostgreSQL separately.
- Backup retention / rotation. Operators manage the files in `backups/` themselves; the scripts do not prune old snapshots.
- Application-level data export (JSON fixtures, CSV). The backup is a straight SQL dump.
- Backing up uploaded media files (profile pictures, documents). They live in Django's media directory, not the database; a separate `make backup-media` is a possible follow-up.

## Approach

- **Format**: plain SQL, gzipped. `pg_dump` without `-Fc` produces text SQL that can be restored with `psql`, making the pipeline `gunzip -c | psql` trivially portable across PostgreSQL versions. Gzip reduces typical text dumps by ~10×, keeping local disk usage modest.
- **Executor**: the scripts invoke `docker compose exec -T db` so they work identically against a local stack or a deployed one that uses the same compose file. `-T` disables TTY allocation so stdin/stdout can be piped.
- **Config source**: `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` default to `nursery`/`nursery`/`nursery` (the values hardcoded in `docker-compose.yml`). If a `.env` file exists at the repo root, the scripts source it first so a customized setup still works.
- **Naming**: `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz`. The timestamp makes filenames sort lexicographically in chronological order, which keeps "latest backup" selection trivial (`ls -t … | head -n 1`).
- **Restore safety**: `scripts/restore-db.sh` refuses to proceed without an explicit `yes` typed by the operator at a prompt. When invoked non-interactively (no `/dev/tty`), an explicit environment variable `RESTORE_I_UNDERSTAND=yes` is required. This matches the project's general rule of requiring explicit confirmation for irreversible destructive operations.
- **Restore sequence**: drops the database with `DROP DATABASE IF EXISTS … WITH (FORCE)` (PostgreSQL 13+) so active backend connections are terminated, recreates an empty database, then restores from the gzipped SQL via `gunzip -c | psql`. The `WITH (FORCE)` option is available on PostgreSQL 16 (already the version in use).
- **Upgrade integration**: `make upgrade` prepends a `[1/5] Backing up database...` step that calls `$(MAKE) backup`. Make's standard error propagation halts the upgrade if the backup fails. Operators can opt out for a known-skip-backup upgrade by setting `SKIP_BACKUP=1 make upgrade`, which the target checks and short-circuits with a warning.
- **Container readiness**: both scripts call `docker compose up -d db` as a no-op idempotent start and then wait for `pg_isready` before issuing the actual dump/restore. This makes the scripts safe to call from a cold stack (e.g. immediately after `make up`) without asking the operator to manage container lifecycle.
- **Gitignore**: `backups/*.sql` and `backups/*.sql.gz` go into `.gitignore`, while `backups/.gitkeep` keeps the directory in the tree so `make backup` never fails with "no such directory".
