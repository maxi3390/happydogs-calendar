# Design — data-portability

## Entities covered

Listed in **export order** (= forward FK-dependency order). Import deletes in reverse and re-inserts in this same order.

| # | Entity            | App              | Model                                   | FK targets                          |
|---|-------------------|------------------|-----------------------------------------|-------------------------------------|
| 1 | NurserySetting    | nursery_settings | `NurserySetting`                        | —                                   |
| 2 | VaccinationType   | pets             | `VaccinationType`                       | —                                   |
| 3 | Vet               | pets             | `Vet`                                   | —                                   |
| 4 | Owner             | pets             | `Owner`                                 | Vet (primary_vet, emergency_vet)    |
| 5 | Pet               | pets             | `Pet`                                   | Owner, Vet (vet_override)           |
| 6 | Vaccination       | pets             | `Vaccination`                           | Pet                                 |
| 7 | MedicalNote       | pets             | `MedicalNote`                           | Pet                                 |
| 8 | Schedule          | pets             | `Schedule`                              | Pet                                 |

**Deliberately excluded**:

- `accounts.User` — overwriting user rows during an import would invalidate the active session and can wipe the superuser. Auth stays out-of-band.
- `rest_framework_simplejwt.token_blacklist.*` — SimpleJWT internal tables, tied to the `User` table.
- `Document` rows that reference an uploaded file on disk. The `Document` model's `file` is a `FileField`; without bundling the blob the row is useless after import. Skipping documents entirely keeps the backup self-contained.
- Uploaded images (`Owner.profile_picture`, `Pet.profile_picture`, `NurserySetting.logo`). Export captures only the non-file scalar fields of `NurserySetting`; profile pictures are skipped. On import, missing image URLs are set to empty.

## JSON format (v1)

```json
{
  "version": 1,
  "exported_at": "2026-04-21T18:04:12Z",
  "generator": "happy-calendar data_portability v1",
  "entities": {
    "nursery_settings": [ { "id": 1, "display_name": "...", ... } ],
    "vaccination_types": [ { "id": 3, "name": "rabies", "label": "Rabies", "enabled": true, "order": 1 }, ... ],
    "vets": [ { "id": 7, "name": "General Vet Clinic", ... } ],
    "owners": [ { "id": 12, "first_name": "Ana", "primary_vet": 7, "emergency_vet": null, ... } ],
    "pets": [ { "id": 42, "name": "Mía", "owner": 12, "vet_override": null, ... } ],
    "vaccinations": [ { "id": 99, "pet": 42, "vax_type": "rabies", "date": "2026-03-15" }, ... ],
    "medical_notes": [ { "id": 51, "pet": 42, "title": "...", "description": "..." }, ... ],
    "schedules": [ { "id": 77, "pet": 42, "start_date": "2026-04-23", "start_time": "09:00:00", ... } ]
  }
}
```

Rules:

- `id` is preserved from the source DB so FK ids in later entities still point at the right rows.
- Dates and times use ISO 8601 strings.
- Decimals (e.g. `Pet.weight`) are serialized as strings (never float) to avoid silent precision loss.
- Booleans are native JSON.
- Nulls are native JSON.
- Image / file fields are omitted (profile pictures, logo file).

The envelope version lets us evolve the format later. Reading a future version with an older server fails fast with a clear error.

## CSV format (v1)

A ZIP archive (content type `application/zip`, file extension `.zip`) containing:

```
manifest.json       # {"version": 1, "exported_at": "...", "files": [...]}
nursery_settings.csv
vaccination_types.csv
vets.csv
owners.csv
pets.csv
vaccinations.csv
medical_notes.csv
schedules.csv
```

Per-entity CSVs:

- UTF-8, comma-separated, RFC 4180-style quoting.
- Header row with the exact model field names.
- Empty cell ⇔ NULL for nullable fields.
- Dates / decimals / booleans use the same string conventions as JSON.

The manifest declares the order in which files must be loaded (same as the JSON entity list) so the importer does not rely on alphabetical order or manifest-key hashing.

## Import validation

- Refuse to run if the envelope version is not `1`.
- Refuse if a required entity file/key is missing (so a partial upload does not partially wipe the DB).
- Refuse if the first byte doesn't match a known magic (`{` for JSON, `PK\x03\x04` for ZIP).
- Validate FK integrity: every `owner` id in `pets` must exist in the `owners` list in the same payload. On failure, roll back with the offending entity/row indicated.

## Permissions

Any authenticated user can export or import. Rationale: the user asked for this in the general settings, not the admin page, and the existing product does not have granular roles beyond admin. The surface is guarded by:

- JWT authentication (required on both endpoints).
- A loud in-UI confirmation gate on import (typing `RESTORE` into a small input field enables the button).

If finer permissioning is ever needed, adding `permission_classes = [IsAdminUser]` to the import view is a one-line change.

## URL surface

```
GET  /api/data-portability/export?format=json   → application/json, attachment
GET  /api/data-portability/export?format=csv    → application/zip, attachment
POST /api/data-portability/import               → multipart; file detected from content
```

Registered via `backend/data_portability/urls.py` → `nursery/urls.py`.

## Transactional semantics

The import view wraps both the delete and insert phases in `transaction.atomic()`. If any row fails validation, integrity checking, or the `.bulk_create` step, the whole transaction rolls back and the DB ends up in the state it was in before the request. The response payload includes a structured error:

```json
{
  "detail": "Import failed",
  "entity": "pets",
  "row_index": 42,
  "error": "owner id 999 not found in payload"
}
```

The frontend renders that message inline.

## Rejected alternatives

- **Django `loaddata` / `dumpdata`** — ignores app boundaries cleanly but produces fixture JSON tied to Django's internal model registry; user-facing CSV is out. Also hits the "FK ids must line up" problem the same way we handle it, without giving us the UX guardrails.
- **Plain `pg_dump` / `pg_restore` behind a button** — requires shelling out from the web container, handles schema + data together (which isn't what we want when the point is migrating across versions), and exposes bytes that aren't meaningful to an operator.
- **`make backup` integration** — already exists and already works. This change complements it rather than replaces it. The CLI path is the one we'd recommend for ops; the UI path is the one for staff who don't have shell access.
- **Partial / selective export** — valuable but expands scope significantly (UX, schema versioning per entity). Save for a follow-up if asked.
- **Optimistic-concurrency "merge" semantics on import** — turns a simple "restore from backup" into a conflict-resolution dialog. Replace-semantics matches both the motivation ("backup before upgrade") and the `make restore` counterpart.
