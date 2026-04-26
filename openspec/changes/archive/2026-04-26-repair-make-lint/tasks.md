# Tasks — Repair `make lint`

## Phase 1 — Config

- [x] Add `backend/.flake8` with `max-line-length = 120` and `exclude = migrations,staticfiles,media,.venv,__pycache__`.
- [x] Run `make lint`; capture the residual violation count → **77** (broke down as 34 W293, 21 E501, 17 F401, 3 W291, 2 E129).

## Phase 2 — Sweep residuals

- [x] Sweep was 77 violations, above the 30-line / 10-file threshold the proposal cited. We sub-divided rather than splitting the change: trivial whitespace and unused-import passes are pure-mechanical wins (54 of the 77), and the substantive remainder (23 lines: 21 E501, 2 E129) was small enough to clean up in the same PR.
  - [x] Remove unused imports (`F401`) across 8 files.
  - [x] Strip trailing whitespace and indent-only lines (`W291`, `W293`) in `accounts/`.
  - [x] Wrap long descriptions and parameter declarations in `pets/views.py`, `nursery_settings/views.py`, `pets/admin.py`, `pets/serializers.py`, `pets/management/commands/seed_example_data.py`, `pets/tests/test_document_api.py`, `domain/owners/models.py`.
  - [x] Reformat the multi-line conditionals in `domain/pets/models.py` to clear `E129`.

## Phase 3 — Frontend lint scope

- [x] Discovered `next lint` was removed in Next 16; the `frontend/package.json` `lint` script is broken upstream (independent of this change).
- [x] Split `make lint` into a meta-target depending on `lint-backend`. Frontend lint is tracked separately; the spec accommodates the future addition of a `lint-frontend` target without changing the backend contract.

## Phase 4 — Verify

- [x] `make lint` exits 0.
- [x] `make lint-backend` exits 0.
- [x] Backend test suite still green: 397 tests pass.

## Phase 5 — Spec + archive

- [x] Live spec: `openspec/specs/tooling/lint/spec.md` documents the backend config, the meta-target, and the four scenarios (clean pass, genuine warning fails, 90-col line passes, 200-col line still fails).
- [x] Archive this change folder.
