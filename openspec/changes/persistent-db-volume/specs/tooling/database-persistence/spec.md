# Delta for Tooling Database Persistence

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: Postgres Volume Is External And Persistent

The PostgreSQL data volume SHALL be declared as an external Docker volume with the fixed name `happy-calendar_postgres_data`, so `docker compose down -v` and any Makefile target that runs it cannot remove the volume. Container lifecycle operations SHALL leave the volume and its data intact.

#### Scenario: `docker compose down -v` preserves the data volume

- GIVEN the stack is running with a populated database
- WHEN the operator runs `docker compose down -v --remove-orphans` directly
- THEN the containers SHALL be removed
- AND the `happy-calendar_postgres_data` volume SHALL still exist
- AND the data inside SHALL be intact

### Requirement: Volume Is Auto-Provisioned On First Use

`make up`, `make init`, `make upgrade`, `make backup`, and `make restore` SHALL ensure the external volume exists before invoking `docker compose`. A fresh clone SHALL NOT require manual volume creation.

#### Scenario: Fresh clone starts cleanly

- GIVEN a fresh clone on a host with no `happy-calendar_postgres_data` volume
- WHEN the operator runs `make init`
- THEN the target SHALL create the Docker volume as part of its execution
- AND `docker compose up` SHALL succeed
- AND the stack SHALL come up with an empty database ready for migrations

#### Scenario: Auto-provision is idempotent

- GIVEN the volume already exists and holds data
- WHEN any target depending on `volume-ensure` runs
- THEN the command SHALL be a no-op
- AND the database contents SHALL remain unchanged

### Requirement: `make clean` Is Safe-For-Data; `make destroy-db` Is Explicit

`make clean` SHALL stop and remove containers WITHOUT removing data volumes (the recipe SHALL NOT pass `-v`). `make destroy-db` SHALL be the only path to remove the data volume, requiring `yes` at a TTY prompt or `RESTORE_I_UNDERSTAND=yes` non-interactively. On confirmation, it SHALL bring the stack down and remove the volume.

#### Scenario: `make clean` leaves data intact

- GIVEN a populated database
- WHEN the operator runs `make clean` and then `make up`
- THEN the database SHALL be reachable with all pre-clean data

#### Scenario: `make destroy-db` requires confirmation

- GIVEN the operator runs `make destroy-db`
- WHEN interactive confirmation is not given (or `RESTORE_I_UNDERSTAND=yes` is not set non-interactively)
- THEN the target SHALL abort with a non-zero status and leave the volume intact

#### Scenario: Confirmed destroy removes the volume

- GIVEN confirmation is given
- WHEN `make destroy-db` runs
- THEN the `db` container SHALL stop
- AND the `happy-calendar_postgres_data` volume SHALL be removed
- AND `make up` afterwards SHALL auto-provision a fresh empty volume
