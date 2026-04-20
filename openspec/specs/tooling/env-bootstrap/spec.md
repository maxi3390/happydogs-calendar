# Tooling: Environment Bootstrap Specification

## Purpose

Define the contract for how the repository bootstraps local `.env` configuration. The goal is that a fresh clone can reach a working stack by running `make init` without any tribal knowledge — the missing-`.env` failure mode that turns `http://localhost/` into a silent 404 must be unreachable from the happy path, and each variable the stack depends on must be self-explanatory.

## Requirements

### Requirement: `.env.example` Is Self-Documenting

The repository SHALL provide a `.env.example` file at the repository root that lists every environment variable the running stack depends on. Each variable SHALL be preceded by a human-readable comment block explaining:

- What the variable controls.
- Whether the variable is required for local development or only for production deployment.
- What default value is appropriate for local development, including whether a blank value is acceptable.

New variables that the stack starts to depend on SHALL be added to `.env.example` with a comment block in the same format in the same change.

#### Scenario: Variable purpose is documented inline

- GIVEN a reader opens `.env.example`
- WHEN they scroll to any variable definition
- THEN that definition SHALL be preceded by one or more `#`-prefixed comment lines
- AND those comments SHALL explain the variable's purpose in plain English

#### Scenario: Local development defaults yield a working stack

- GIVEN a fresh clone of the repository
- WHEN a user copies `.env.example` to `.env` verbatim
- THEN the resulting `.env` SHALL boot the Docker Compose stack successfully for local development
- AND production-only variables (Let's Encrypt email, Cloudflare API token) SHALL have blank defaults so no fake credentials ship in the copied file

### Requirement: `make env` Creates `.env` Interactively And Idempotently

The repository SHALL provide a `make env` target that creates `.env` at the repository root based on `.env.example`. The target SHALL:

- Walk every variable block in `.env.example` in order.
- For each variable, print the variable's documentation, its default (or a note that blank is acceptable if the default is empty), and prompt for a value.
- Accept an empty user input as "use the default as-is", regardless of whether that default is a concrete value or blank.
- Preserve each variable's comment block in the generated `.env` so later manual edits retain the same guidance.
- Refuse to overwrite an existing `.env`: if `.env` already exists, the target SHALL print a notice and exit with status 0 without touching the file.
- Fall back to silently applying the defaults when not attached to a controlling TTY, printing a one-line notice that the non-interactive path was taken.

#### Scenario: Interactive run on a fresh clone

- GIVEN a repository checkout with no `.env`
- AND the current shell is attached to a TTY
- WHEN a user runs `make env` and accepts the default for every prompt
- THEN a new `.env` file SHALL be written at the repository root
- AND the file SHALL contain every variable from `.env.example` with the example default
- AND the comment blocks SHALL be preserved in the output file

#### Scenario: User customises values

- GIVEN a repository checkout with no `.env`
- AND a user runs `make env` attached to a TTY
- WHEN the user enters a non-empty value for a variable prompt
- THEN the user-supplied value SHALL be written to `.env` for that variable
- AND other variables SHALL use their respective defaults unless the user entered values for them too

#### Scenario: Blank input for a production-only variable

- GIVEN a variable whose default in `.env.example` is blank
- WHEN the user presses Enter at the prompt
- THEN the generated `.env` SHALL contain `KEY=` with an empty value
- AND `docker compose` SHALL treat that variable as unset without failing

#### Scenario: Idempotent on re-run

- GIVEN a repository checkout with an existing `.env` file
- WHEN a user runs `make env`
- THEN the target SHALL print a notice that `.env` already exists
- AND the existing `.env` SHALL NOT be modified
- AND the target SHALL exit with status 0

#### Scenario: Non-TTY fallback

- GIVEN a repository checkout with no `.env`
- AND `make env` is invoked from a context without a readable `/dev/tty` (e.g. CI, piped stdin)
- WHEN the target runs
- THEN `.env` SHALL be written using the defaults from `.env.example`
- AND the target SHALL print a notice indicating defaults were applied because no TTY was available

### Requirement: `make init` And `make upgrade` Cooperate With `.env`

The repository-level setup and maintenance targets SHALL cooperate with the env-bootstrap flow:

- `make init` SHALL depend on `.env` being present. When `.env` is missing, `make init` SHALL invoke `make env` before any other first-time-setup step.
- `make upgrade` SHALL print a warning (not an error) when `.env` is missing, directing the operator to run `make env`. The upgrade steps SHALL still run so production deployments aren't blocked by a missing local file.

#### Scenario: `make init` on a fresh clone

- GIVEN a fresh clone with no `.env`
- AND the current shell is attached to a TTY
- WHEN the user runs `make init`
- THEN `make env` SHALL run first and produce a `.env` file
- AND the usual `build → up → migrate → create-admin` steps SHALL run afterward
- AND the stack SHALL be reachable at the expected URLs once setup completes

#### Scenario: `make init` with existing `.env`

- GIVEN an `.env` file already exists at the repository root
- WHEN the user runs `make init`
- THEN `make env` SHALL NOT run (the env-check step is a no-op)
- AND the usual setup steps SHALL run as today

#### Scenario: `make upgrade` warns on missing `.env`

- GIVEN a deployment where `.env` is missing
- WHEN an operator runs `make upgrade`
- THEN the target SHALL print a warning pointing the operator at `make env`
- AND the `git pull → build → up → migrate` sequence SHALL still execute
