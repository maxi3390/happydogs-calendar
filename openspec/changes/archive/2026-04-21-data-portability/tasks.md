# Tasks

## 1. Backend app scaffolding
- [x] 1.1 Create `backend/data_portability/__init__.py` + `apps.py` (AppConfig).
- [x] 1.2 Register `'data_portability'` in `INSTALLED_APPS` in `backend/nursery/settings.py`.
- [x] 1.3 Create `backend/data_portability/urls.py` and include it from `backend/nursery/urls.py`.

## 2. Exporter
- [x] 2.1 Implement `backend/data_portability/exporter.py` with two public entrypoints:
  - `export_json()` → `bytes` containing the versioned JSON envelope.
  - `export_zip()` → `bytes` containing a ZIP with per-entity CSVs + `manifest.json`.
- [x] 2.2 Cover NurserySetting, VaccinationType, Vet, Owner, Pet, Vaccination, MedicalNote, Schedule. Preserve PKs, serialise dates/times/decimals deterministically, skip image fields.
- [x] 2.3 Deterministic ordering: iterate `.order_by('pk')` so the same DB produces the same bytes.

## 3. Importer
- [x] 3.1 Implement `backend/data_portability/importer.py`:
  - `import_file(file) → ImportSummary`.
  - Detect format from first byte(s): `{` → JSON, `PK` → ZIP; otherwise raise `ImportValidationError`.
  - Wrap delete-then-reinsert in `transaction.atomic()`.
  - Validate envelope version == 1 before any write.
- [x] 3.2 Delete in reverse dependency order, re-insert in forward order. Preserve PKs via `pk=` and `bulk_create` (or `save()` per row when the model has non-null defaults that collide).
- [x] 3.3 Report structured validation errors (entity name, row index, message).

## 4. Views and URLs
- [x] 4.1 Add `GET /api/data-portability/export` — accepts `?format=json` (default) or `?format=csv`. Returns `application/json` or `application/zip` with a `Content-Disposition: attachment; filename=...` header.
- [x] 4.2 Add `POST /api/data-portability/import` — multipart file upload, streams the file into the importer.
- [x] 4.3 Both endpoints require `IsAuthenticated`. drf-spectacular tags: `['data-portability']`.

## 5. Backend tests
- [x] 5.1 `backend/data_portability/tests.py`:
  - JSON round-trip: seed some rows, export, wipe, import, assert counts and key fields survive.
  - ZIP round-trip: same.
  - Import is atomic: corrupt one row, assert no partial writes (DB unchanged on failure).
  - Format detection: reject a file that is neither JSON nor ZIP.
  - Auth: unauthenticated GET / POST return 401 / 403.
- [x] 5.2 All existing tests still pass (259 baseline).

## 6. Frontend domain module
- [x] 6.1 Create `frontend/src/domain/data-portability/{types,api,index}.ts`:
  - `types.ts`: `ImportSummary` type.
  - `api.ts`: `dataPortabilityApi.exportUrl(format)` (returns the GET URL string so the browser can drive download) and `importFile(file)` using the existing `uploadFile` helper.
- [x] 6.2 Register on `api` in `frontend/src/lib/api.ts` and re-export the types.

## 7. Frontend settings UI
- [x] 7.1 Add a "Data Backup" card to `frontend/src/app/settings/page.tsx`:
  - Two download buttons: Export JSON, Export CSV. Each opens the export URL in the browser so the native download prompt fires.
  - Import area: file picker, a small text input labeled "type RESTORE to confirm", and a primary button that is disabled until the text input equals `RESTORE` exactly.
  - On successful import, show a toast with the import summary; on error, show the inline error from the API.
- [x] 7.2 Pull auth token from `localStorage.auth_tokens.access` and append as `Authorization` header on the export requests via a `fetch` wrapper (`<a href>` can't carry headers). The actual download is triggered by creating an object URL from the fetched blob and clicking a hidden anchor.

## 8. Translations
- [x] 8.1 Add `dataBackup.*` namespace to both `backend/translations/en.json` and `backend/translations/es.json`. Keys: `title`, `description`, `exportSection`, `exportJson`, `exportCsv`, `importSection`, `importDescription`, `pickFile`, `confirmPlaceholder`, `importButton`, `confirmHint`, `importing`, `importSuccess`, `importFailed`, `restoreToken` (the literal `RESTORE` value).
- [x] 8.2 Confirm both JSON files parse.

## 9. Specs
- [x] 9.1 `openspec/changes/data-portability/specs/backend/data-portability/spec.md` (ADDED delta, full contract).
- [x] 9.2 `openspec/changes/data-portability/specs/frontend/settings/spec.md` (MODIFIED delta: new Data Backup card requirement).
- [x] 9.3 Baseline `openspec/specs/backend/data-portability/spec.md` and append to `openspec/specs/frontend/settings/spec.md`.

## 10. Verification
- [x] 10.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` — all tests green.
- [x] 10.2 `docker run --rm -v "$PWD/frontend":/app -w /app node:20-alpine sh -c "npx --no-install tsc --noEmit -p tsconfig.json"` — 0 errors.
- [x] 10.3 Manual: seed the dev DB, export JSON, restart, import, confirm counts match via `docker compose exec db psql` or the API list endpoints.
- [x] 10.4 Manual: repeat with CSV ZIP.
- [x] 10.5 Confirm the "RESTORE" confirmation guard behaves as spec'd in the browser.
