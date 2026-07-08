# Tasks — Pagination, N+1s, indexes

## Phase 1 — Backend pagination

- [x] Add `nursery/pagination.py::StandardPagination` (`PAGE_SIZE=50`,
      `page_size` query param, `max_page_size=200`); set it as
      `DEFAULT_PAGINATION_CLASS`.
- [x] Confirm the paginated envelope on list endpoints (updated ~34 API tests
      to read `response.data['count']` / `['results']`).

## Phase 2 — Kill N+1s

- [x] `OwnerViewSet`: `annotate(pet_count=Count('pets'))` +
      `select_related('primary_vet', 'emergency_vet')` + stable `order_by`.
- [x] `PetViewSet`: `annotate(medical_notes_count=Count('medical_notes'))` +
      `select_related('owner', 'vet_override', 'owner__primary_vet',
      'owner__emergency_vet')` + `prefetch_related('vaccinations')` (the nested
      vaccinations were a second N+1 the query-count test caught) + stable
      `order_by`.
- [x] Serializer count fields read the annotation, falling back to the relation
      when unannotated (detail/create paths).
- [x] `assertNumQueries`-style tests (`CaptureQueriesContext`) proving pet and
      owner list query counts are constant as row count grows.

## Phase 3 — Indexes

- [x] Add `Meta.indexes` to `Schedule` for `(start_date, end_date)` and
      `(pet, start_date)`.
- [x] Generated migration `pets/0017_...` (lands in the `pets` app).

## Phase 4 — Frontend contract

- [x] Add `fetchList<T>` to `src/domain/_http/client.ts`: unwraps the envelope
      and follows `next`, returning a full array so callers are unchanged.
- [x] Point all 12 paginated `list()` methods at `fetchList` (custom actions
      like `owners/dropdown`, `pets/{id}/compatibility` stay on `fetchApi`).
- [x] Fix `PublicCalendar` (raw `fetch`) to unwrap + follow `next`.

## Phase 5 — Verify + spec + archive

- [x] Backend: 542 tests pass (incl. 3 new pagination tests); flake8 clean.
- [x] Frontend: production `next build` compiles + passes TypeScript.
- [~] `make test-frontend` (Playwright e2e) not run in this environment
      (heavy image pulls); the frontend contract is verified by a clean
      production build. e2e is recommended before merge.
- [ ] Update live `openspec/specs/backend/{pets,owners,schedules}/spec.md` and
      the relevant `frontend/*` list specs on archive.
- [ ] Update `docs/docs/backend/intro.md` (endpoints now paginated).
- [ ] Archive this change folder.
