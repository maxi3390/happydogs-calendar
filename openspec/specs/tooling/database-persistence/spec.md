# Tooling: Database Persistence Specification

## Purpose

Define the durability contract for the PostgreSQL data that backs the application. The database is a shared asset across deployment lifecycles — upgrades, restarts, rebuilds, cleanups — and its storage must survive every routine operator command. Accidental destruction SHALL be possible only via an explicitly destructive, confirmation-gated target. Together with the `tooling/backup` capability (on-demand / pre-upgrade snapshots), this capability provides three independent layers of durability:

1. Volume storage that persists across the container lifecycle.
2. Backups written to `backups/` before every upgrade and on demand.
3. A single explicit command for intentional wipes.

## Requirements

### Requirement: Postgres Volume Is External And Persistent

The PostgreSQL data volume SHALL be declared as an external Docker volume with a fixed name (`happy-calendar_postgres_data`) so that `docker compose down -v` — and therefore any Makefile target that runs it — cannot remove it. Container lifecycle operations (`up`, `down`, `restart`, `rebuild`, `build`, `stop`) SHALL leave the volume and its data intact.

#### Scenario: `docker compose down -v` preserves the data volume

- GIVEN the stack is running with a populated database
- WHEN the operator runs `docker compose down -v --remove-orphans` directly
- THEN the containers SHALL be removed
- AND the `happy-calendar_postgres_data` volume SHALL still exist afterwards
- AND the data inside it SHALL be intact

#### Scenario: `make clean` preserves the data volume

- GIVEN the stack is running with a populated database
- WHEN the operator runs `make clean`
- THEN the containers SHALL be removed
- AND the `happy-calendar_postgres_data` volume SHALL still exist afterwards

#### Scenario: Restarts and rebuilds preserve data

- GIVEN the stack is running with a populated database
- WHEN the operator runs `make restart`, `make rebuild`, `make down` followed by `make up`, or `make upgrade`
- THEN the database data SHALL still be present after the stack comes back up

### Requirement: Volume Is Auto-Provisioned On First Use

Targets that bring containers up or talk to the `db` service SHALL ensure the external volume exists before invoking `docker compose`. An operator cloning the repository for the first time SHALL NOT need to manually create the Docker volume.

The targets that must guarantee the volume exists are: `make up`, `make init`, `make upgrade`, `make backup`, and `make restore`.

#### Scenario: Fresh clone starts cleanly

- GIVEN a fresh clone of the repository on a host with no `happy-calendar_postgres_data` volume
- WHEN the operator runs `make init`
- THEN the Makefile SHALL create the Docker volume as part of the target
- AND `docker compose up` SHALL succeed without a "No such volume" error
- AND the stack SHALL come up with an empty database ready for migrations

#### Scenario: `make up` on a host with the volume missing recreates it

- GIVEN the operator has previously removed the volume (for example via `make destroy-db`)
- WHEN the operator runs `make up`
- THEN the Makefile SHALL recreate the volume (empty)
- AND the stack SHALL come up successfully
- AND the database SHALL need to be re-populated via migrations, restore, or seed data

#### Scenario: Auto-provision is idempotent

- GIVEN the `happy-calendar_postgres_data` volume already exists and has data
- WHEN a target that depends on `volume-ensure` runs
- THEN the command SHALL complete without recreating or touching the data
- AND the database contents SHALL remain unchanged

### Requirement: `make clean` Is Safe-For-Data

`make clean` SHALL stop and remove the stack's containers without removing any data volumes. The target SHALL NOT pass `-v` to `docker compose down`. Operators who want to destroy the database SHALL use the dedicated `make destroy-db` target instead.

#### Scenario: `make clean` recipe does not reference `-v`

- GIVEN the current Makefile
- WHEN an operator inspects the `clean` target's recipe
- THEN the recipe SHALL NOT contain `-v` or any equivalent flag that would remove volumes

#### Scenario: `make clean` leaves data intact

- GIVEN the stack is running with a populated database
- WHEN the operator runs `make clean`
- AND the operator then runs `make up`
- THEN the database SHALL be reachable with all its pre-clean data intact

### Requirement: `make destroy-db` Is Explicit And Confirmation-Gated

`make destroy-db` SHALL be the only Makefile target that removes the `happy-calendar_postgres_data` volume. Because the operation is irreversible, the target SHALL require explicit confirmation:

- Interactive invocations (TTY attached) SHALL prompt the operator and refuse to proceed unless `yes` is typed.
- Non-interactive invocations SHALL require `RESTORE_I_UNDERSTAND=yes` as an environment variable (reusing the convention established by `make restore`).

On confirmed invocation, the target SHALL:

1. Bring the stack down with `docker compose down` so the `db` container releases its lock on the volume.
2. Remove the volume with `docker volume rm happy-calendar_postgres_data`.

After destruction, a subsequent `make up` / `make init` SHALL recreate the volume via the `volume-ensure` prerequisite.

#### Scenario: Interactive destroy requires typed confirmation

- GIVEN an operator in an interactive shell
- WHEN the operator runs `make destroy-db`
- THEN the target SHALL display a warning describing what it is about to remove
- AND prompt for confirmation
- WHEN the operator types anything other than `yes`
- THEN the target SHALL abort with a non-zero status
- AND the volume SHALL remain intact

#### Scenario: Non-interactive destroy requires opt-in variable

- GIVEN `make destroy-db` is invoked without a readable `/dev/tty`
- AND `RESTORE_I_UNDERSTAND=yes` is NOT set
- WHEN the target runs
- THEN it SHALL exit with a non-zero status before issuing any `docker volume rm`
- AND the volume SHALL remain intact

#### Scenario: Confirmed destroy removes the volume

- GIVEN an operator types `yes` at the prompt (or sets `RESTORE_I_UNDERSTAND=yes`)
- WHEN `make destroy-db` runs
- THEN the `db` container SHALL be stopped
- AND the `happy-calendar_postgres_data` volume SHALL be removed
- AND a subsequent `make up` SHALL auto-provision an empty replacement volume
