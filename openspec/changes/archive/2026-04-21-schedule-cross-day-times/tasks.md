# Tasks

## 1. Backend validators
- [x] 1.1 `ScheduleCreateSerializer.validate()` — apply the `start_time >= end_time` check only when `start_date == end_date`. `>=` (not `>`) so single-day zero-duration bookings are still rejected.
- [x] 1.2 `BatchScheduleCreateSerializer.validate()` — same rule.
- [x] 1.3 Update the error message to reflect the same-day context.

## 2. Backend tests
- [x] 2.1 `test_multi_day_cross_day_time_allowed` — POST to `schedule-list` with `start_date=today`, `end_date=today+2`, `start_time=18:00`, `end_time=10:00` succeeds.
- [x] 2.2 Keep `test_invalid_time_range` green — single-day `17:00 → 09:00` still rejected.
- [x] 2.3 `test_batch_create_multi_day_cross_day_time_allowed` — batch endpoint accepts the multi-day cross-day case.
- [x] 2.4 Keep `test_batch_create_invalid_time` green — single-day batch `17:00 → 09:00` still rejected.

## 3. Frontend form
- [x] 3.1 `frontend/src/components/ScheduleForm.tsx` end-time `<select>` — filter `TIME_OPTIONS` to `t > startTime` only when `startDate === endDate`. Multi-day schedules show every option.
- [x] 3.2 Ensure `tsc --noEmit` stays at 0 errors.

## 4. Spec
- [x] 4.1 `openspec/changes/schedule-cross-day-times/specs/backend/schedules/spec.md` — backend delta describing the relaxed validator.
- [x] 4.2 `openspec/changes/schedule-cross-day-times/specs/frontend/schedules/spec.md` — frontend delta describing the matching form behavior.

## 5. Verification
- [x] 5.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` — 291 + 2 new tests pass.
- [x] 5.2 `tsc --noEmit` — 0 errors.
- [x] 5.3 Manual: open the schedule form, set `startDate == endDate`, confirm end-time dropdown only offers times after `startTime`. Switch to `endDate > startDate`, confirm end-time dropdown offers the full day.
