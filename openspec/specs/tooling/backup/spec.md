# Tooling: Database Backup And Restore Specification

## Purpose

Define operator-facing commands for snapshotting and restoring the PostgreSQL database that backs the application. Backups exist so that destructive operations (Django migrations, accidental data loss, debugging on a production-like dataset) can be reversed with a single command. The contract intentionally prioritizes safety (explicit confirmation on restore, fail-closed by default, never auto-prune) over advanced features (parallel restore, point-in-time recovery, off-site replication).

## Requirements

### Requirement: `make backup` Produces A Full Gzipped Dump

`make backup` SHALL produce a single `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz` file containing a complete `pg_dump` of the running database. The dump SHALL be full (schema + data), executed via the `db` service in `docker-compose.yml`, and piped through `gzip` on the way to disk.

The target SHALL start the `db` container automatically if it is not already running and wait for `pg_isready` before dumping. If the container fails to become ready within a reasonable timeout, `make backup` SHALL exit with a non-zero status and a clear error message.

The target SHALL print the path and on-disk size of the file it just wrote.

#### Scenario: Running backup on a live stack

- GIVEN the stack is running with a populated database
- WHEN the operator runs `make backup`
- THEN a new file matching `backups/nursery-<timestamp>.sql.gz` SHALL appear
- AND the file SHALL be a valid gzipped plain-SQL `pg_dump`
- AND the target SHALL print the written path and the file size

#### Scenario: Running backup on a cold stack

- GIVEN no containers are running
- WHEN the operator runs `make backup`
- THEN the `db` container SHALL be started as part of the target
- AND the backup SHALL complete successfully once the container reports healthy

#### Scenario: Database fails to become ready

- GIVEN the `db` container cannot reach a ready state
- WHEN the operator runs `make backup`
- THEN the target SHALL exit with a non-zero status before invoking `pg_dump`
- AND the operator SHALL see an error message indicating the database was not ready

### Requirement: `make restore` Restores A Named Or Latest Backup

`make restore` SHALL restore the database from a gzipped SQL backup. The target SHALL accept an explicit path via the `BACKUP_FILE=` environment variable and SHALL default to the newest file matching `backups/nursery-*.sql.gz` when no path is supplied.

Because restoration is destructive, the target SHALL require explicit confirmation:

- When invoked on a TTY, the target SHALL prompt the operator and SHALL NOT proceed unless the operator types `yes`.
- When invoked non-interactively (no readable `/dev/tty`), the target SHALL require the `RESTORE_I_UNDERSTAND=yes` environment variable.

On confirmed restore, the target SHALL drop the target database with `DROP DATABASE IF EXISTS … WITH (FORCE)` (so active backend connections are terminated), recreate an empty database owned by the same user, and then load the gzipped SQL via `gunzip -c <file> | psql`.

#### Scenario: Restoring the latest backup interactively

- GIVEN at least one `backups/nursery-*.sql.gz` file exists
- AND the operator is in an interactive shell
- WHEN the operator runs `make restore`
- THEN the target SHALL identify the most recent backup
- AND prompt for confirmation
- WHEN the operator answers `yes`
- THEN the database SHALL be dropped and recreated
- AND the schema and data from the backup SHALL be loaded
- AND the target SHALL print a completion message

#### Scenario: Restoring a specific backup

- GIVEN a specific backup file the operator wants to restore from
- WHEN the operator runs `BACKUP_FILE=backups/nursery-2026-04-01-120000.sql.gz make restore`
- THEN the target SHALL use that file as the source
- AND the default "latest file" selection SHALL be ignored

#### Scenario: Refusing without confirmation on a TTY

- GIVEN the operator is in an interactive shell
- WHEN the operator runs `make restore` and answers anything other than `yes` at the prompt
- THEN the target SHALL abort with a non-zero status
- AND the database SHALL NOT be touched

#### Scenario: Refusing in non-interactive context without opt-in

- GIVEN `make restore` is invoked without a controlling TTY (e.g. via CI, `docker exec` without `-it`)
- AND the `RESTORE_I_UNDERSTAND=yes` environment variable is NOT set
- WHEN the target runs
- THEN it SHALL exit with a non-zero status before issuing any `DROP` statements
- AND the database SHALL NOT be touched

#### Scenario: Non-interactive opt-in

- GIVEN `make restore` is invoked without a TTY
- AND `RESTORE_I_UNDERSTAND=yes` is exported
- WHEN the target runs
- THEN the restore SHALL proceed without an interactive prompt

### Requirement: Backup Files Are Gitignored

The repository SHALL ignore actual backup artifacts while keeping the `backups/` directory tracked.

#### Scenario: Generated backup is not committed

- GIVEN a new `backups/nursery-<timestamp>.sql.gz` has been produced
- WHEN the operator runs `git status`
- THEN the backup file SHALL NOT appear as an untracked or modified file

#### Scenario: Backups directory survives a fresh clone

- GIVEN a fresh clone of the repository
- WHEN the operator inspects the working tree
- THEN the `backups/` directory SHALL exist
- AND `make backup` SHALL be able to write into it without first creating the directory
