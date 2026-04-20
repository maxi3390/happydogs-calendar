# Delta for Tooling Upgrade

## MODIFIED Requirements

### Requirement: Single-Command System Upgrade

`make upgrade` SHALL execute the following sequence and halt on the first failure. The new first step is a database backup so every upgrade produces a rollbackable snapshot by default.

1. `make backup` — produce a full gzipped pre-upgrade database snapshot under `backups/` (see the `tooling/backup` capability). This step MAY be skipped by exporting `SKIP_BACKUP=1`; when skipped the target SHALL print a visible warning.
2. `git pull`
3. `docker compose build`
4. `docker compose up -d`
5. `docker compose exec backend python manage.py migrate`

#### Scenario: Successful upgrade of a clean stack

- GIVEN a running stack on the current branch's upstream
- WHEN the operator runs `make upgrade`
- THEN a pre-upgrade database backup SHALL be written to `backups/`
- AND the remaining steps (pull, build, up, migrate) SHALL run in order
- AND a completion message SHALL be printed

#### Scenario: Upgrade halts on backup failure

- GIVEN the `db` container cannot be reached
- WHEN the operator runs `make upgrade`
- THEN `make backup` SHALL fail and subsequent steps SHALL NOT run

#### Scenario: Opt-out with SKIP_BACKUP=1

- GIVEN the operator exports `SKIP_BACKUP=1`
- WHEN they run `make upgrade`
- THEN the backup step SHALL be skipped with a visible warning
- AND the remaining steps SHALL run normally

#### Scenario: Upgrade halts on migration failure leaves backup intact

- GIVEN a pending migration fails to apply
- WHEN the operator runs `make upgrade`
- THEN the pre-upgrade backup written in step 1 SHALL still be present under `backups/`
- AND the operator MAY use `make restore` to roll the database back
