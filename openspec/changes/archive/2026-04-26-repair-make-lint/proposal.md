# Repair `make lint`

## Why

`make lint` runs `flake8 .` against the backend with no project-level config. Flake8 defaults to `max-line-length = 79`, which the codebase has never followed: a clean run today reports 607 violations across nearly every file. The signal-to-noise ratio is so bad that nobody runs lint, every new file inherits the mess, and a real warning would land buried under hundreds of pre-existing E501s.

This is the textbook "broken windows" state — fix it before adding more code, or accept that linting is decorative. We pick the former.

## What

Add a top-level `backend/.flake8` that pins the project's actual line-length tolerance and excludes auto-generated files. Run `make lint` once, fix the residue, and ensure it exits 0 from then on so CI (next change up) can rely on it.

Concretely:

- `max-line-length = 120` — matches what most existing code already does, and is the same value almost every Python project on the planet picks once they've outgrown 79.
- `exclude = migrations,staticfiles,media` — generated migration files are noisy and not worth lint-clean by hand; static and media are not source.
- Keep all genuine warnings (`F401` unused imports, `F841` unused variables, `E305`, etc.) — they're real bugs.
- After applying the config, sweep any remaining genuine warnings.

## Impact

- New file: `backend/.flake8`.
- A handful of small fixes for any remaining warnings the new config still surfaces (unused imports, etc.).
- `make lint` becomes a passing check that the upcoming CI workflow can wire to PR gating.

## Out of scope

- Frontend lint config. `next lint` already has its own setup; that's a separate problem.
- Adding new lint rules (mccabe, etc.). One discipline at a time.
