# Delta for Tooling Database Backup And Restore

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: `make backup` Produces A Full Gzipped Dump

`make backup` SHALL produce a single `backups/nursery-<YYYY-MM-DD-HHMMSS>.sql.gz` file containing a complete `pg_dump` of the running database, executed through the `db` service in `docker-compose.yml` and piped through `gzip`. The target SHALL start and wait for the `db` container if it is not already ready, and SHALL print the written path and the file size on success.

#### Scenario: Running backup on a live stack

- GIVEN the stack is running with a populated database
- WHEN the operator runs `make backup`
- THEN a new file matching `backups/nursery-<timestamp>.sql.gz` SHALL appear
- AND the file SHALL be a valid gzipped plain-SQL `pg_dump`

#### Scenario: Running backup on a cold stack

- GIVEN no containers are running
- WHEN the operator runs `make backup`
- THEN the `db` container SHALL be started as part of the target
- AND the backup SHALL complete once the container reports healthy

### Requirement: `make restore` Restores A Named Or Latest Backup

`make restore` SHALL restore the database from a gzipped SQL backup. It SHALL accept `BACKUP_FILE=path`; when absent, it SHALL default to the newest `backups/nursery-*.sql.gz`. Because the operation is destructive, it SHALL require `yes` typed at a TTY prompt OR the `RESTORE_I_UNDERSTAND=yes` environment variable when invoked non-interactively. On confirmed restore, it SHALL `DROP DATABASE IF EXISTS … WITH (FORCE)`, recreate, and load the gzipped SQL.

#### Scenario: Restoring the latest backup interactively

- GIVEN at least one backup file exists
- WHEN the operator runs `make restore` and answers `yes`
- THEN the latest backup SHALL be used
- AND the database SHALL be dropped, recreated, and loaded from that file

#### Scenario: Refusing without confirmation

- GIVEN the operator answers anything other than `yes` at the prompt
- WHEN `make restore` runs
- THEN the target SHALL abort without touching the database

#### Scenario: Non-interactive opt-in

- GIVEN `make restore` runs without a TTY and with `RESTORE_I_UNDERSTAND=yes`
- WHEN the target runs
- THEN the restore SHALL proceed without a prompt

### Requirement: Backup Files Are Gitignored

`backups/*.sql` and `backups/*.sql.gz` SHALL be excluded from version control; the `backups/` directory itself SHALL remain tracked via a `.gitkeep` sentinel so `make backup` can write into it on a fresh clone.

#### Scenario: Fresh clone has backups directory

- GIVEN a fresh clone of the repository
- WHEN the operator runs `make backup`
- THEN the target SHALL write into `backups/` without first creating the directory
