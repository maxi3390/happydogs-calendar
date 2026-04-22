# Tasks

## 1. Backend
- [x] 1.1 `ScheduleCreateSerializer.validate()` — apply `start_time > end_time` check only when `start_date == end_date`. Use `>` (not `>=`) so the change is strictly a relaxation.
- [x] 1.2 `BatchScheduleCreateSerializer.validate()` — same rule.
- [x] 1.3 Update the error message to reflect the same-day context.

## 2. Tests
- [x] 2.1 `test_multi_day_cross_day_time_allowed` — POST to `schedule-list` with `start_date=today`, `end_date=today+2`, `start_time=18:00`, `end_time=10:00` succeeds.
- [x] 2.2 Keep `test_invalid_time_range` green — single-day `17:00 → 09:00` still rejected.
- [x] 2.3 `test_batch_create_multi_day_cross_day_time_allowed` — batch endpoint accepts the multi-day cross-day case.
- [x] 2.4 Keep `test_batch_create_invalid_time` green — single-day batch `17:00 → 09:00` still rejected.

## 3. Spec
- [x] 3.1 Write `openspec/changes/schedule-cross-day-times/specs/backend/schedules/spec.md` — MODIFIED delta describing the relaxed rule.

## 4. Verification
- [x] 4.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` — 291 + 2 new tests pass.
- [x] 4.2 No frontend changes expected; `tsc --noEmit` not strictly required but run to be safe.
