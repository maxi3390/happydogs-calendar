# Proposal — schedule-cross-day-times

## Intent

Today the backend rejects any schedule where `start_time >= end_time`, regardless of whether it's a single-day booking or a multi-day stay. That rule makes sense on a same-day booking (you can't check out before you check in), but it's wrong for multi-day stays: `start_time` belongs to `start_date` (drop-off time) and `end_time` belongs to `end_date` (pickup time). A pet that arrives at 18:00 Monday and leaves at 10:00 Wednesday is a perfectly normal booking, but the current validator rejects it with "End time must be after start time".

Relax the rule so the time ordering constraint only applies on single-day schedules.

## Rule

- **Single-day schedule** (`start_date == end_date`): reject if `start_time > end_time` (the pet can't check out before it checks in on the same day). `start_time == end_time` is still rejected because it's a zero-duration booking that doesn't make sense.
- **Multi-day schedule** (`end_date > start_date`): no ordering constraint between `start_time` and `end_time`. They represent wall-clock times on two different days.

The date ordering rule (`start_date <= end_date`) is unchanged.

## Scope

### In scope

- `ScheduleCreateSerializer.validate()` in `backend/pets/serializers.py`: apply time-order check only when `start_date == end_date`.
- `BatchScheduleCreateSerializer.validate()` in `backend/pets/serializers.py`: same.
- Existing regression tests stay green (they all use `start_date == end_date` and drive the time-order path).
- New positive test: a multi-day schedule with `start_time > end_time` is accepted.
- New positive test for batch endpoint: same scenario via `/batch_create`.

### Out of scope

- Revisiting `Schedule.get_overlapping_schedules()` / `check_conflicts()`. Those methods currently compare `start_time`/`end_time` as if they were a daily window that repeats each day in the `[start_date, end_date]` range. That model is already an approximation for multi-day stays (even before this change) and relaxing the validation doesn't make it worse — a cross-day boarding that goes Mon 18:00 → Wed 10:00 is continuously present, not "18:00–10:00 every day". A proper model requires a bigger redesign of the conflict engine and is filed as a follow-up concern, not tackled here.
- Frontend validation. The schedule form already accepts any `<input type="time">` value and lets the backend enforce the rule; no UI change is required for the new behavior to work.

## Approach

1. In both serializers, wrap the existing `start_time >= end_time` check in a guard that only fires when `start_date == end_date`. Tighten the message to the same-day context (`Start time cannot be after end time on a single-day schedule`) so operators understand why the rule applies.
2. Add backend tests covering the new permitted case (multi-day cross-day time) plus a regression test that single-day cross-day times are still rejected. The batch endpoint gets the equivalent pair.
3. Spec delta under `backend/schedules` documents the rule.
