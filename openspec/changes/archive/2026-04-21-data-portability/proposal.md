# Proposal — data-portability

## Intent

Give operators a one-click "download a complete backup of all my data" button and a matching "restore from backup" upload, both from the general Settings page. The intended workflow is taking a snapshot before a risky operation (a Django migration, a version bump, bulk edits) so the operator can roll back without involving a DBA or the `make backup` / `make restore` CLI path.

## Scope

### In scope

- Exporting the full catalogue of user-created domain data to a single file:
  - **JSON**: one `.json` file with a versioned envelope and one array per entity.
  - **CSV**: a `.zip` archive containing one `.csv` per entity plus a `manifest.json` declaring the format version and entity order.
- Importing from either format, auto-detected by the first byte(s) of the uploaded file (`{` → JSON, `PK` → ZIP).
- Import semantics are **replace**: every in-scope entity is wiped and re-populated inside a single atomic database transaction. A failure mid-import leaves the DB exactly as it was.
- A new section in the general `/settings` page (available to every authenticated user, not admin-only) with:
  - Two download buttons: "Export JSON", "Export CSV".
  - An import area with a file picker and a "type RESTORE to confirm" guard. The restore button stays disabled until the operator types `RESTORE` (case-sensitive) into a small confirmation input.
- A new `backend/data_portability/` Django app housing the exporter / importer / view / URLs. Separating this from `nursery_settings` keeps the portability logic — which crosses every domain — from bleeding into the settings model.
- OpenSpec baseline for the new backend capability and a MODIFIED delta on `frontend/settings` that pins the UI contract.

### Out of scope

- User accounts and auth tables. Overwriting rows in `accounts.User` or DRF SimpleJWT's token blacklist during an import would instantly invalidate the current session and can also clobber the superuser. The backup contract stays focused on domain data; user management remains an out-of-band concern.
- Uploaded file contents (pet / owner profile pictures, `Document.file` uploads). Files on disk aren't affected by schema migrations, which is the stated motivation; bundling large binary blobs inside a JSON/CSV export also explodes file sizes and crosses into "full storage snapshot" territory. The existing `make backup` path already captures the DB; the filesystem is the operator's responsibility.
- Migration schema import (i.e. carrying the schema version inside the backup). The backup is a **data** backup. Restoring into a DB with a different schema version is not supported and will fail with validation errors, which is the correct behavior.
- Partial exports (e.g. "just owners"). The goal is a full snapshot; picking subsets complicates the UX and the restore contract without a clear use case.
- Granular CSV per-entity export buttons. "CSV" here means the full backup as a ZIP; users who just want one entity can inspect the ZIP contents.

## Approach

1. Add a Django app `data_portability`. No models of its own — it reads / writes the existing models in `pets.*` and `nursery_settings.*`.
2. Export pipeline:
   - For each entity, iterate rows in a deterministic order (usually `order_by('pk')`) and collect their serializable form.
   - JSON: wrap in `{"version": 1, "exported_at": "...", "entities": {...}}` and `json.dumps` with `default=str` for dates / decimals.
   - CSV: write one StringIO per entity, wrap them all in a `ZipFile` (`zipfile.ZipFile` → BytesIO) together with the manifest.
3. Import pipeline:
   - Peek at the first bytes to decide format (`{` → JSON; `PK\x03\x04` → ZIP).
   - Parse and validate the envelope version (currently only `1`).
   - Inside `transaction.atomic()`:
     - Delete rows in reverse-dependency order: Schedule → Vaccination → MedicalNote → Pet → Owner → Vet → VaccinationType (→ NurserySetting).
     - Re-insert in forward order, preserving primary keys so foreign-key ids still match.
   - On any validation / integrity error, the `atomic()` block rolls back; the view returns a structured 400 with the first error and an entity/row locator.
4. Frontend:
   - A new "Data Backup" section in `/settings` with the three actions described in scope.
   - The Export buttons simply `window.location.href = /api/data-portability/export?format=...` to let the browser drive the download.
   - Import uses `multipart/form-data` via the existing `uploadFile` helper.
   - The restore confirmation mirrors the existing `make restore` CLI UX (literal `yes` / `RESTORE` string) so the muscle memory transfers.
