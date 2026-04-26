# Tooling: Lint Specification

## Purpose

Make `make lint` a dependable signal that catches genuine bugs (unused imports, dead variables, unindented blocks, runaway lines) without drowning the developer in pre-existing pep8 noise. The codebase's actual line-length tolerance was always 120 columns; flake8's default 79-column setting was being universally ignored, leaving the linter useless. This spec pins the project's working policy so the linter can be wired to CI gating.

## Requirements

### Requirement: `make lint-backend` SHALL exit 0 on a clean tree

`make lint-backend` SHALL execute `flake8 .` against `backend/`. The configuration SHALL live at `backend/.flake8` and SHALL set:

- `max-line-length = 120` — the project's actual style; 79 is too tight and was being universally ignored.
- `exclude = migrations,staticfiles,media,.venv,__pycache__` — auto-generated and vendored content is not linted. Hand-written data migrations live inside the excluded `migrations/` directory and are accepted as unlinted; they are short and not a typical bug surface.

The configuration MUST NOT broadly disable rule classes (`E5xx`, `F4xx`). Genuine warnings (unused imports `F401`, unused locals `F841`, missing blank lines `E305`/`E306`, trailing whitespace `W291`/`W293`) SHALL remain enforced.

#### Scenario: Lint passes on a clean tree

- GIVEN every Python file complies with PEP 8 except line length up to 120 and the seeded excludes
- WHEN the operator runs `make lint-backend`
- THEN the command SHALL exit 0
- AND no violations SHALL be printed

#### Scenario: A new genuine warning fails the check

- GIVEN a developer adds an unused `import os` to `backend/notifications/services.py`
- WHEN they run `make lint-backend`
- THEN flake8 SHALL report `F401 'os' imported but unused`
- AND the command SHALL exit non-zero

#### Scenario: A 90-column line passes

- GIVEN a developer writes a 90-column line in non-migration code
- WHEN they run `make lint-backend`
- THEN no E501 violation SHALL be reported (the line is under the 120-column cap)

#### Scenario: A 200-column line still fails

- GIVEN a developer writes a 200-column f-string in non-migration code
- WHEN they run `make lint-backend`
- THEN flake8 SHALL report E501
- AND the command SHALL exit non-zero

### Requirement: `make lint` SHALL be a meta-target that delegates to per-language targets

`make lint` SHALL invoke `make lint-backend` (today the only language with a working linter) and SHALL exit 0 when every per-language target exits 0. When the frontend lint is migrated off the removed `next lint` subcommand, the meta-target SHALL be extended to also invoke a `lint-frontend` target without changing the contract for `make lint-backend`.

#### Scenario: `make lint` exits 0 on a clean tree

- GIVEN every Python file complies with the backend lint config
- WHEN the operator runs `make lint`
- THEN the command SHALL exit 0
- AND it SHALL invoke `make lint-backend` as a dependency
