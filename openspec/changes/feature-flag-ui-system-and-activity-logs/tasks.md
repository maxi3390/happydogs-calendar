# Tasks

## Setup
- [x] Create branch `feat/feature-flag-ui-system-and-activity-logs`
- [x] Scaffold OpenSpec change folder

## Backend
- [x] `feature_flags/migrations/0005_seed_ui_system_and_activity_logs.py` — seed both flags (`ui_system` default off, `activity_logs` default on) via `get_or_create`; reverse migration is a no-op
- [x] `audit_log/views.py` — gate `AuditLogActivityView.get` with `is_feature_enabled('activity_logs')` (returns 404 when off; runs after IsAdmin so 401 / 403 still take precedence for unauthorised callers)
- [x] `feature_flags/tests.py` — extend `SEEDED_KEYS`, `ENABLED_BY_DEFAULT`, and `DISABLED_BY_DEFAULT` so `test_every_canonical_flag_is_seeded` and `test_seeded_defaults` cover both new flags
- [x] `audit_log/tests/test_activity_feed.py` — 2 new tests covering the 404 gate and the admin-then-flag ordering (non-admin still gets 403 with the flag off)

## Frontend
- [x] `Navigation.tsx` — pull `useFeatureFlag('ui_system')` and `useFeatureFlag('activity_logs')`; gate the desktop dropdown links AND the mobile menu links with the matching flag
- [x] `app/admin/activity/page.tsx` — render `data-testid="activity-disabled"` empty-state card when the flag is off; skip the API fetch in the disabled branch
- [x] `app/ui-system/page.tsx` — render `data-testid="ui-system-disabled"` empty-state card when the flag is off
- [x] `tests/helpers.ts` — add `stubFeatureFlags(page, overrides)` helper returning every canonical flag with seed defaults; expose `Route` import
- [x] `tests/navigation.spec.ts` — update the existing UI System dropdown test to stub `ui_system: true` (new default is off)
- [x] `tests/feature-flag-ui-system-and-activity-logs.spec.ts` — new spec, 6 tests (link hidden / link visible / page disabled, per surface)

## i18n
- [x] `backend/translations/en.json` — `featureFlags.flags.ui_system` and `featureFlags.flags.activity_logs` blocks
- [x] `backend/translations/es.json` — same in Spanish

## Live spec
- [x] `openspec/specs/backend/feature-flags/spec.md` — extend canonical-flags scenario with both new keys + their documented defaults
- [x] `openspec/specs/backend/audit-log/spec.md` — new Requirement covering the 404 gate + auth-then-flag ordering
- [x] `openspec/specs/frontend/navigation/spec.md` — update profile-dropdown enumeration; pivot UI System scenarios on the flag; add Activity scenarios; mobile menu enumeration mirrors the same conditions
- [x] `openspec/specs/frontend/audit-activity/spec.md` — fold flag state into the dropdown Requirement; add new Requirement for the empty-state branch

## Verification
- [x] `make test-backend`: 509 passing (was 507; +2 new gate tests)
- [x] `make lint` (backend): clean
- [x] `tsc --noEmit` via `node:24-alpine` one-off: clean
- [x] `make test-frontend`: 138 passing (was 132; +6 new gating tests)

## Commit
- [x] Single commit on `feat/feature-flag-ui-system-and-activity-logs`
- [ ] Wait for explicit operator consent before merge / push
