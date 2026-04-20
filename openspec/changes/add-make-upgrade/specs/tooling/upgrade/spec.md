# Delta for Tooling: Upgrade

## ADDED Requirements

### Requirement: Single-Command System Upgrade

The system SHALL provide a `make upgrade` target that performs a complete upgrade of a running deployment in the correct order.

#### Scenario: Successful upgrade of a clean stack

- GIVEN an operator has a running Happy Pet Nursery stack on the current branch's upstream
- AND there are new commits on the upstream branch, including code changes and a new database migration
- WHEN the operator runs `make upgrade`
- THEN the latest code SHALL be pulled via `git pull`
- AND Docker images SHALL be rebuilt (leveraging the build cache)
- AND running containers SHALL be recreated for images whose hash changed
- AND any pending Django migrations SHALL be applied
- AND a completion message SHALL be printed

#### Scenario: Upgrade with no new changes is a no-op

- GIVEN the local branch is up to date with upstream
- AND the containers are running with the current images
- AND there are no pending migrations
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL report "Already up to date"
- AND the build SHALL reuse cached layers
- AND containers SHALL not be recreated
- AND `migrate` SHALL report "No migrations to apply"
- AND the upgrade SHALL complete without error

#### Scenario: Upgrade halts on git pull failure

- GIVEN the local working tree has uncommitted changes that conflict with upstream
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL fail with a merge-conflict or dirty-tree error
- AND subsequent steps (build, up, migrate) SHALL NOT run
- AND the operator SHALL see the git error message

#### Scenario: Upgrade halts on image build failure

- GIVEN the pulled code contains a syntax error that breaks the image build
- WHEN the operator runs `make upgrade`
- THEN `git pull` SHALL succeed
- AND `docker compose build` SHALL fail with the build error
- AND subsequent steps (up, migrate) SHALL NOT run
- AND the operator SHALL see the Docker build error

#### Scenario: Upgrade halts on migration failure

- GIVEN a pending migration fails to apply (e.g., invalid SQL, schema conflict)
- WHEN the operator runs `make upgrade`
- THEN earlier steps (pull, build, up) SHALL have succeeded
- AND `python manage.py migrate` SHALL fail with the migration error
- AND the operator SHALL see the Django migration error message

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
- THEN progress messages SHALL be printed in sequence identifying each phase (pulling code, rebuilding images, restarting services, running migrations)
- AND a final "Upgrade complete" message SHALL be printed on success
