# Tooling: Upgrade Specification

## Purpose

Define the behavior of the `make upgrade` action which is the canonical way to update a running Happy Pet Nursery deployment to the latest version. This operator-facing target chains the four steps required for a complete upgrade (pull → build → restart → migrate) into a single command.

## Requirements

### Requirement: Single-Command System Upgrade

The system SHALL provide a `make upgrade` target that performs a complete upgrade of a running deployment in the correct order.

The target SHALL execute, in sequence:

1. `git pull` — fetch the latest commits from the current branch's upstream
2. `docker compose build` — rebuild images (leveraging Docker's layer cache)
3. `docker compose up -d` — recreate containers whose image hash changed
4. `docker compose exec backend python manage.py migrate` — apply any pending Django migrations

If any step fails, the target MUST stop immediately and surface the failing command's exit code. Subsequent steps MUST NOT run.

#### Scenario: Successful upgrade of a clean stack

- GIVEN an operator has a running stack on the current branch's upstream
- AND there are new commits upstream, including code changes and a new migration
- WHEN the operator runs `make upgrade`
- THEN the latest code SHALL be pulled
- AND Docker images SHALL be rebuilt
- AND running containers SHALL be recreated for changed images
- AND any pending Django migrations SHALL be applied
- AND a completion message SHALL be printed

#### Scenario: Upgrade with no new changes is a no-op

- GIVEN the local branch is up to date with upstream
- AND containers are running with the current images
- AND there are no pending migrations
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL report the branch is already up to date
- AND the build SHALL reuse cached layers
- AND containers SHALL not be recreated
- AND the migration step SHALL report no migrations to apply
- AND the upgrade SHALL complete without error

#### Scenario: Upgrade halts on git pull failure

- GIVEN the local working tree has uncommitted changes that conflict with upstream
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL fail
- AND subsequent steps (build, up, migrate) SHALL NOT run
- AND the operator SHALL see the git error message

#### Scenario: Upgrade halts on image build failure

- GIVEN the pulled code contains a change that breaks the image build
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL succeed
- AND the build step SHALL fail with the build error
- AND subsequent steps (up, migrate) SHALL NOT run

#### Scenario: Upgrade halts on migration failure

- GIVEN a pending migration fails to apply
- WHEN the operator runs `make upgrade`
- THEN earlier steps SHALL have succeeded
- AND the migration step SHALL fail with the Django migration error

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
