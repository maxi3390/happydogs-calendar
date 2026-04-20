# Delta for Tooling Environment Bootstrap

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: `.env.example` Is Self-Documenting

`.env.example` at the repository root SHALL list every environment variable the running stack depends on, each preceded by a `#`-prefixed comment block explaining the variable's purpose, whether it is required for local development, and its appropriate default.

#### Scenario: Local defaults yield a working stack

- GIVEN a fresh clone
- WHEN a user copies `.env.example` to `.env` verbatim
- THEN the stack SHALL boot successfully for local development
- AND production-only variables SHALL have blank defaults

### Requirement: `make env` Creates `.env` Interactively And Idempotently

`make env` SHALL walk `.env.example` block by block, print each variable's documentation, prompt for a value, accept blank input as "use the default", preserve comment blocks in the generated `.env`, refuse to overwrite an existing `.env`, and fall back to defaults silently when no TTY is available.

#### Scenario: Fresh interactive run

- GIVEN no `.env` exists
- AND the shell is attached to a TTY
- WHEN `make env` runs and the user accepts every default
- THEN `.env` SHALL be written with the defaults from `.env.example`
- AND comment blocks SHALL be preserved

#### Scenario: Idempotent on re-run

- GIVEN an existing `.env`
- WHEN `make env` runs
- THEN the existing file SHALL NOT be modified
- AND the target SHALL exit with status 0

#### Scenario: Non-TTY fallback

- GIVEN no `.env` exists
- AND `make env` is invoked without a readable `/dev/tty`
- WHEN the target runs
- THEN `.env` SHALL be written using the defaults from `.env.example`
- AND a notice SHALL be printed

### Requirement: `make init` And `make upgrade` Cooperate With `.env`

`make init` SHALL invoke `make env` when `.env` is missing before any other setup step. `make upgrade` SHALL warn (not fail) when `.env` is missing and still run its usual steps.

#### Scenario: Fresh-clone `make init`

- GIVEN a clone with no `.env`
- AND a TTY is attached
- WHEN the user runs `make init`
- THEN `make env` SHALL run first
- AND setup SHALL continue with `build → up → migrate → create-admin`

#### Scenario: `make upgrade` warns on missing `.env`

- GIVEN `.env` is missing
- WHEN `make upgrade` runs
- THEN a warning SHALL be printed pointing at `make env`
- AND the upgrade steps SHALL still execute
