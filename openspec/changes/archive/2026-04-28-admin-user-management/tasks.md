# Tasks

## Setup
- [x] Create branch `feat/admin-user-management`
- [x] Scaffold OpenSpec change folder

## Backend
- [x] Per-user actions: deactivate, activate, promote, demote
- [x] `destroy` precondition: target must be inactive (return 400 otherwise)
- [x] `deletion_impact` GET endpoint returning `{ notifications, audit_log_entries }`
- [x] Bulk endpoints: bulk_deactivate, bulk_activate, bulk_delete, bulk_set_role
- [x] Self-protection guard (no deactivate / demote / delete on `request.user`)
- [x] Last-admin guard (cannot drop active-admin count to zero)
- [x] List filters on `GET /api/users/`: role, is_active, last_login_within_days, last_login_never
- [x] Backend tests: ~15 across actions, guards, filters, bulk

## Frontend
- [x] Domain API: usersApi.deactivate / activate / promote / demote / deletionImpact / bulk* / list(params)
- [x] Filter bar (role select, status select, last-login select)
- [x] Bulk-select checkboxes + sticky action bar
- [x] Per-row action menu (More-actions popover)
- [x] Delete modal with impact summary
- [x] URL-state filters via `useSearchParams`

## i18n
- [x] New keys in backend/translations/en.json and es.json
- [x] Mocks in frontend/tests/helpers.ts

## Tests
- [x] Playwright: filters apply to list, sticky bar appears on selection, delete blocked when active, promote/demote, bulk actions

## Specs / verification / commit
- [x] Update live spec `openspec/specs/backend/auth/spec.md`
- [x] Update live spec `openspec/specs/frontend/user-management/spec.md`
- [x] Verify: `make test-backend`, `make test-frontend`, `npm run build`, `npm run lint`
- [x] Archive change folder under `openspec/changes/archive/<date>-admin-user-management/`
- [x] Single commit on the feat branch
- [x] DO NOT merge or push without explicit operator consent
