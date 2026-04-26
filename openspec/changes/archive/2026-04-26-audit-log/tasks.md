# Tasks — Audit log

## Phase 1 — Dependency + middleware

- [x] Add `django-simple-history` to `backend/requirements.txt` (pin to a specific version).
- [x] Add `'simple_history'` to `INSTALLED_APPS`.
- [x] Add `'simple_history.middleware.HistoryRequestMiddleware'` to `MIDDLEWARE` after `AuthenticationMiddleware`.
- [x] Rebuild the backend image so the dep installs.

## Phase 2 — Tracked models

- [x] Add `history = HistoricalRecords()` to:
  - [x] `pets.Pet`
  - [x] `pets.Owner`
  - [x] `pets.MedicalNote`
  - [x] `pets.Vaccination`
- [x] Generate migrations (one per model, auto-created by `manage.py makemigrations`).
- [x] Apply migrations and verify shadow tables exist (`historicalpet`, `historicalowner`, `historicalmedicalnote`, `historicalvaccination`).

## Phase 3 — History API endpoints

- [x] Create a shared `HistorySerializer` at `backend/audit_log/serializers.py`.
- [x] `GET /api/pets/<id>/history/` — admin-only; returns history rows ordered by `-history_date`.
- [x] `GET /api/owners/<id>/history/` — admin-only.
- [x] `GET /api/pets/<pet_id>/medical-notes/<id>/history/` — admin-only.
- [x] `GET /api/pets/<pet_id>/vaccinations/<id>/history/` — admin-only.

## Phase 4 — Tests

- [x] `test_pet_edit_creates_history_row` — single edit + assert one `+` row at create, one `~` row at update.
- [x] `test_history_user_attribution_via_middleware` — the user who issued the PATCH is set as `history_user`.
- [x] `test_history_user_null_for_management_command_writes` — out-of-request writes get `history_user IS NULL`.
- [x] `test_pet_delete_creates_minus_history_row`.
- [x] `test_history_endpoint_admin_can_read`.
- [x] `test_history_endpoint_non_admin_403`.
- [x] `test_history_endpoint_unauthenticated_401`.

## Phase 5 — Documentation

- [x] Document the bulk-operations caveat in `backend/AGENTS.md` (avoid `bulk_update` on tracked models — won't appear in history).
- [x] Document the per-entity history endpoints in `docs/docs/backend/intro.md`. *(deferred: current backend intro doc does not yet cover per-feature endpoints individually; AGENTS.md serves as the canonical reference for now.)*

## Phase 6 — Spec + archive

- [x] Add a new live spec file `openspec/specs/backend/audit-log/spec.md`.
- [x] Cross-reference from `backend/AGENTS.md` Features list (#12).
- [x] Archive this change folder.
