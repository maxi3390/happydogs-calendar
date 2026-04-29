# Admin activity feed

## Why

The audit-log infrastructure already records every write on the four tracked entities (`Pet`, `Owner`, `MedicalNote`, `Vaccination`) via `simple_history`. Admins can already query the per-entity history (`/api/pets/<id>/history/` etc.), but there's no unified, browsable view of "what changed across the whole nursery in the last week".

For incident response, accountability, and onboarding (when a new admin joins and wants to see how the team uses the system), a chronological cross-entity activity feed is the natural complement to the existing per-entity drill-down. It uses the same audit-log data — no new write path, no new model — just a different read shape.

## What

1. **Backend**: a new admin-only endpoint `GET /api/audit-log/activity/` returning a unified, filterable, paginated stream of changes across all tracked entities.
   - Query params: `user` (id), `entity_type` (`pet|owner|medical_note|vaccination`), `action` (`+|~|-`), `since` (ISO timestamp), `until` (ISO timestamp), `limit` (default 50, max 200), `offset` (default 0).
   - Response shape: `{ count, results: [{ entity_type, entity_id, entity_label, history_id, history_type, history_date, history_user }, ...] }`.
   - `entity_label` is a human-readable name per entity (Pet → `name`, Owner → `first_name last_name`, MedicalNote → `title`, Vaccination → `vax_type`).
2. **Frontend**: a new admin-only page at `/admin/activity` that:
   - Renders a filter row (entity type, action, last-N days, user dropdown).
   - Renders a table with timestamp, user, action badge, entity type, entity label.
   - Paginates server-side via `limit` / `offset`.
   - Each row links to the existing per-entity history endpoint when one is available (stretch goal — out of scope for this change).
3. **Navigation**: admin profile dropdown gets a new "Activity" entry alongside Settings / Admin / UI System (admin-only, mirrors the existing pattern).
4. **i18n**: new `audit` namespace with the labels for the page + filters.
5. **Tests**:
   - Backend: 6 tests covering admin-only, paginated response shape, the four filter dimensions, and merged ordering across models.
   - Playwright: 2 tests covering "feed renders" + "filter applies".

## Impact

- **No data model changes.** All data already exists in the `Historical*` tables.
- **No new write path.** The feed is read-only.
- **Performance**: cross-model union is done in Python on the result set. Cap of 200 rows per page keeps the work bounded; for a small nursery that's fine. If the team grows past ~10k history entries we revisit with a SQL-level union.
- **Live spec**: new capability `backend/audit-log` (extend the existing one) + frontend `audit-activity`.

## Out of scope

- **Per-row diff visualization.** Today the row says "user X edited Pet Y at 14:30". The actual field-level diff (old vs new) is recoverable from the existing `Historical*` snapshots but renders best as a drill-down on the per-entity history page; out of scope here.
- **Webhook / live update.** No SSE / polling. The page refetches on filter change; that's enough.
- **Schedules and other un-tracked entities.** `simple_history` is currently wired on the four entities only; this change doesn't broaden tracking. If we want Schedule history, that's a separate `feat/track-schedule-history` change.
- **CSV / JSON export.** Useful but a separate concern; the JSON endpoint is already callable via curl if someone needs to script around it.
