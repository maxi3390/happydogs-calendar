# Tasks

## Setup
- [x] Create branch `feat/admin-activity-feed`
- [x] Scaffold OpenSpec change folder

## Backend
- [x] `audit_log/views.py` — new `AuditLogActivityView` (admin-only)
  - Per-entity TRACKED_ENTITIES registry (manager + label resolver)
  - Filters: entity_type, action, user, since, until
  - Pagination via offset/limit (limit silently clamped to [1, 200])
  - Response shape `{count, results: [{entity_type, entity_id, entity_label, history_id, history_type, history_date, history_user}]}`
- [x] `audit_log/urls.py` — register `GET /api/audit-log/activity/`
- [x] 14 tests in `audit_log/tests/test_activity_feed.py` covering admin-only, response shape, filter dimensions, sorting, validation, pagination

## Frontend
- [x] `frontend/src/domain/auditLog/types.ts` + `api.ts`
- [x] `frontend/src/app/admin/activity/page.tsx` — withAdmin page with filter row, table, server-side pagination
- [x] Wire `auditLog: auditLogApi` into `frontend/src/lib/api.ts`
- [x] Navigation: "Activity" entry added to both desktop dropdown (role=menuitem) and mobile menu

## i18n
- [x] `audit.activity.*` keys in `backend/translations/{en,es}.json`
- [x] Mirror block in `frontend/tests/helpers.ts`

## Tests
- [x] Playwright: 2 specs in `tests/admin-activity-feed.spec.ts` — feed renders, filter round-trips

## Live spec
- [x] Extend `openspec/specs/backend/audit-log/spec.md` — Requirement + 6 scenarios
- [x] New `openspec/specs/frontend/audit-activity/spec.md` — page contract + 6 scenarios

## Verification
- [x] `make test-backend`: 507 passing (was 493, +14 new)
- [x] `make test-frontend`: 132 passing (was 130, +2 new)
- [x] Lint clean
- [x] TypeScript clean

## Commit
- [x] Single commit on the feat branch
- [x] Merged into master (operator approval received post-review)