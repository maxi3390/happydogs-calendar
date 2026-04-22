# Proposal — schedule-days-count

## Intent

Operators eyeballing the day sidebar or a schedule's details popup can't tell at a glance how long a stay will last. They have to subtract `start_date` from `end_date` in their head, and then judge whether the checkout time warrants counting the last day. Surface the stay length as a small tag on both surfaces so it's immediately visible.

## Rule

The stay length in days SHALL be computed as:

```
days = (end_date - start_date)  # calendar-day diff, inclusive of start day
     + (end_time > 12:00 ? 1 : 0)  # "did the pet stay past midday on checkout?"
```

Expressed in words: count every full day between `start_date` and `end_date` (exclusive of the checkout day), and add one more if the pet leaves AFTER midday on the checkout day. This matches the hospitality-industry convention used in pet nurseries where a late pickup effectively takes up another day's boarding slot.

Examples:
- `2026-04-21 09:00` → `2026-04-21 12:00` ⇒ `0` days (morning drop-off, out by noon).
- `2026-04-21 09:00` → `2026-04-21 14:00` ⇒ `1` day (same day, but stays past noon).
- `2026-04-21 08:00` → `2026-04-23 10:00` ⇒ `2` days (two nights, out before noon).
- `2026-04-21 08:00` → `2026-04-23 15:00` ⇒ `3` days (two nights + a late-checkout day).

## Scope

### In scope

- A pure helper `computeStayDays(startDate, endDate, endTime)` in `frontend/src/domain/schedules/` that implements the rule above.
- A small tag rendered in two places:
  - `DaySchedule.tsx` (the day sidebar on the calendar page) next to the conflicts tag, same pill-shape + muted palette.
  - `ScheduleDetailsPopup.tsx` next to the status badge at the top.
- Translations: `schedule.dayCount.one` / `schedule.dayCount.other` in both `en` and `es`, interpolated via `{count}` for plurality. Zero-day stays render `0 days` / `0 días` (no special-case copy).

### Out of scope

- Changing the underlying data model. Everything needed (`start_date`, `end_date`, `end_time`) is already on the `Schedule` payload.
- Alternate boarding-day rules (half-days, hourly billing, business-day exceptions). If the kennel wants those later it can layer a configuration flag on top of the same helper.
- Propagating the tag to every other schedule-touching surface (calendar day cells, week view bars, etc.). Keep the change surgical to the two places the user reported; other surfaces can opt in incrementally.

## Approach

1. Add `frontend/src/domain/schedules/stayDays.ts` with a single exported `computeStayDays(startDate: string, endDate: string, endTime: string): number`. Strings are the ISO-formatted values already on the wire (`yyyy-MM-dd` + `HH:mm:ss`), so the helper uses `Date.UTC`-style math to avoid timezone drift.
2. Add a pair of translation keys under `schedule.dayCount.*` with `{count}` interpolation.
3. Render a small `<span>` pill in `DaySchedule.tsx` alongside the existing conflicts pill, and in `ScheduleDetailsPopup.tsx` next to the status chip. Both tags reuse muted surface colors already in play on those pages.
