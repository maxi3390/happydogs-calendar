# Paginate list endpoints, kill N+1s, add hot-path indexes

## Why

List endpoints currently return unbounded result sets and issue avoidable
per-row queries. This is fine at seed-data scale and degrades badly as a real
nursery accumulates owners, pets, and schedules.

- **No pagination.** `REST_FRAMEWORK` sets no `DEFAULT_PAGINATION_CLASS` /
  `PAGE_SIZE`, so `GET /api/owners/`, `/api/pets/`, `/api/schedules/`, etc.
  serialize and return every row in one response.
- **N+1 counts in list serializers.** `OwnerSerializer.get_pet_count` calls
  `obj.pets.count()` and `PetSerializer.get_medical_notes_count` calls
  `obj.medical_notes.count()` once per row — a separate query per object in the
  list.
- **Missing `select_related` for vet FKs.** `OwnerViewSet` and `PetViewSet`
  serialize `primary_vet` / `emergency_vet` / effective-vet details without
  selecting them, adding more per-row queries.
- **No indexes on hot filter/sort columns.** `Schedule.start_date` /
  `end_date` (used by the calendar's date-range filtering and conflict
  detection) and common FK filters have no explicit index.

## What

1. **Pagination.** Configure DRF `PageNumberPagination` with a sane
   `PAGE_SIZE` (e.g. 50) and a `page_size` query override capped at a maximum.
   This changes list responses to the `{count, next, previous, results}`
   envelope.
2. **Frontend contract.** Update the frontend `api` client
   (`frontend/src/lib/api.ts` and the `src/domain/*/api.ts` layer) to read
   `results` and follow `next` where the UI needs the full set. This is a
   coordinated change — the delta specs below cover both sides.
3. **Annotate counts.** Replace the per-row `.count()` calls with
   `annotate(Count(...))` on the viewset querysets (or `prefetch_related` where
   the related objects are also serialized).
4. **`select_related`.** Add the vet FKs to `OwnerViewSet` /`PetViewSet`
   querysets.
5. **Indexes.** Add `Meta.indexes` for `Schedule(start_date, end_date)` and
   `Schedule(pet, start_date)`; confirm FK columns used for filtering are
   indexed (Django indexes FKs by default). Generate the migration.

## Impact

- `backend/nursery/settings.py`: pagination config.
- `backend/pets/views.py` + `backend/pets/serializers.py`: annotations /
  `select_related`.
- `backend/domain/schedules/models.py` + a new migration: indexes.
- `frontend/src/lib/api.ts` + `src/domain/*/api.ts`: consume the paginated
  envelope. **Breaking response-shape change** — must ship backend + frontend
  together.
- Backend + frontend tests updated for the new envelope.

## Out of scope

- Cursor pagination (page-number is enough for this scale).
- Server-side search/sort beyond what already exists.
- Query-count regression tooling in CI (nice follow-up; not required here).
