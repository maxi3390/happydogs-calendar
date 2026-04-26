# ADDED: Tooling / Lint

## ADDED Requirements

### Requirement: `make lint` SHALL exit 0 on a clean tree

`make lint` SHALL execute `flake8 .` against `backend/` and `next lint` against `frontend/`, and BOTH commands SHALL exit 0 when the tree is clean. The backend lint configuration SHALL live at `backend/.flake8` and SHALL set:

- `max-line-length = 120` — the project's actual style; 79 is too tight and was being ignored.
- `exclude = migrations,staticfiles,media,.venv` — auto-generated and vendored content is not linted.

The configuration MUST NOT broadly disable rule classes (`E5xx`, `F4xx`). Genuine warnings (unused imports, unused locals, missing blank lines, trailing whitespace) SHALL remain enforced.

#### Scenario: Lint passes on a clean tree

- GIVEN every Python file complies with PEP 8 except line length up to 120 and the seeded excludes
- WHEN the operator runs `make lint`
- THEN the command SHALL exit 0
- AND no violations SHALL be printed

#### Scenario: A new genuine warning fails the check

- GIVEN a developer adds an unused `import os` to `backend/notifications/services.py`
- WHEN they run `make lint`
- THEN flake8 SHALL report `F401 'os' imported but unused`
- AND the command SHALL exit non-zero

#### Scenario: A 90-column line passes

- GIVEN a developer writes a 90-column line in non-migration code
- WHEN they run `make lint`
- THEN no E501 violation SHALL be reported (the line is under the 120-column cap)

#### Scenario: A 200-column line still fails

- GIVEN a developer writes a 200-column f-string in non-migration code
- WHEN they run `make lint`
- THEN flake8 SHALL report E501
- AND the command SHALL exit non-zero
