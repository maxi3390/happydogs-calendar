# Tooling: Upgrade Specification

## Purpose

Define the behavior of the `make upgrade` action which is the canonical way to update a running Happy Pet Nursery deployment to the latest version. This operator-facing target chains the five steps required for a complete upgrade (backup → pull → build → restart → migrate) into a single command so every upgrade produces a rollbackable pre-upgrade snapshot by default.

## Requirements

### Requirement: Single-Command System Upgrade

The system SHALL provide a `make upgrade` target that performs a complete upgrade of a running deployment in the correct order.

The target SHALL execute, in sequence:

1. `make backup` — produce a full gzipped pre-upgrade database snapshot under `backups/` (see the `tooling/backup` capability). This step MAY be skipped by exporting `SKIP_BACKUP=1`; when skipped the target SHALL print a visible warning.
2. `git pull` — fetch the latest commits from the current branch's upstream. This step MAY be skipped by exporting `SKIP_PULL=1`; when skipped the target SHALL print a visible warning and proceed with the current local working tree.
3. `docker compose build` — rebuild images (leveraging Docker's layer cache)
4. `docker compose up -d` — recreate containers whose image hash changed
5. `docker compose exec backend python manage.py migrate` — apply any pending Django migrations

If any step fails (and is not opted out), the target MUST stop immediately and surface the failing command's exit code. Subsequent steps MUST NOT run.

#### Scenario: Successful upgrade of a clean stack

- GIVEN an operator has a running stack on the current branch's upstream
- AND there are new commits upstream, including code changes and a new migration
- WHEN the operator runs `make upgrade`
- THEN a pre-upgrade database backup SHALL be written to `backups/`
- AND the latest code SHALL be pulled
- AND Docker images SHALL be rebuilt
- AND running containers SHALL be recreated for changed images
- AND any pending Django migrations SHALL be applied
- AND a completion message SHALL be printed

#### Scenario: Upgrade with no new changes is a no-op (apart from the backup)

- GIVEN the local branch is up to date with upstream
- AND containers are running with the current images
- AND there are no pending migrations
- WHEN the operator runs `make upgrade`
- THEN a pre-upgrade database backup SHALL still be written to `backups/`
- AND `git pull` SHALL report the branch is already up to date
- AND the build SHALL reuse cached layers
- AND containers SHALL not be recreated
- AND the migration step SHALL report no migrations to apply
- AND the upgrade SHALL complete without error

#### Scenario: Upgrade halts on backup failure

- GIVEN the `db` container cannot be reached (for example, Docker is not running)
- WHEN the operator runs `make upgrade`
- THEN `make backup` SHALL fail
- AND subsequent steps (pull, build, up, migrate) SHALL NOT run
- AND the operator SHALL see the backup error message

#### Scenario: Upgrade skips backup on explicit opt-out

- GIVEN the operator has already taken a backup by hand and wants to skip the automatic one
- WHEN the operator runs `SKIP_BACKUP=1 make upgrade`
- THEN step 1 SHALL emit a warning that the backup was skipped
- AND the remaining steps SHALL run normally

#### Scenario: Upgrade halts on git pull failure

- GIVEN the local working tree has uncommitted changes that conflict with upstream
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL fail
- AND subsequent steps (build, up, migrate) SHALL NOT run
- AND the operator SHALL see the git error message

#### Scenario: Upgrade halts on image build failure

- GIVEN the pulled code contains a change that breaks the image build
- WHEN the operator runs `make upgrade`
- THEN the backup and `git pull` SHALL succeed
- AND the build step SHALL fail with the build error
- AND subsequent steps (up, migrate) SHALL NOT run

#### Scenario: Upgrade halts on migration failure

- GIVEN a pending migration fails to apply
- WHEN the operator runs `make upgrade`
- THEN earlier steps SHALL have succeeded
- AND the migration step SHALL fail with the Django migration error
- AND the operator SHALL be able to `make restore` from the backup written in step 1

### Requirement: Upgrade Help Entry

The `make help` output SHALL include an entry for `make upgrade` under a "Maintenance" section.

#### Scenario: Help output lists the upgrade command

- WHEN an operator runs `make help`
- THEN the output SHALL include a "Maintenance:" section heading
- AND the section SHALL include an entry for `make upgrade` with a brief description

### Requirement: Upgrade Progress Visibility

The upgrade target SHALL print clear progress headers between each step so the operator can see which phase is currently running.

#### Scenario: Operator observes step-by-step progress

- WHEN the operator runs `make upgrade`
- THEN progress messages SHALL be printed in sequence identifying each phase
- AND a final completion message SHALL be printed on success

### Requirement: Upgrade SHALL skip `git pull` on explicit `SKIP_PULL=1` opt-out

When the operator runs `make upgrade` with the `SKIP_PULL` environment variable set to `1`, step 2 SHALL be skipped: `git pull` MUST NOT be invoked, the target SHALL emit a visible warning that the pull was skipped, and the remaining steps (3–5) SHALL run as if step 2 had succeeded.

The opt-out SHALL be independent of `SKIP_BACKUP`. Setting one, both, or neither SHALL each produce the documented behavior for those steps individually.

#### Scenario: Upgrade skips git pull on explicit opt-out

- GIVEN the operator has already pulled the latest code by hand (or is rebuilding deliberately against the current local tree)
- WHEN the operator runs `SKIP_PULL=1 make upgrade`
- THEN step 2 SHALL emit a warning that the pull was skipped
- AND `git pull` SHALL NOT be invoked
- AND the remaining steps (build, up, migrate) SHALL run normally

#### Scenario: Both opt-outs combine

- GIVEN the operator has already taken a backup AND already pulled the latest code by hand
- WHEN the operator runs `SKIP_BACKUP=1 SKIP_PULL=1 make upgrade`
- THEN step 1 SHALL emit the backup-skipped warning
- AND step 2 SHALL emit the pull-skipped warning
- AND steps 3–5 (build, up, migrate) SHALL run normally
