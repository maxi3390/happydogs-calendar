# Proposal — schedule-days-count

## Intent

Operators eyeballing the day sidebar or a schedule's details popup can't tell at a glance how long a stay will last. They have to subtract `start_date` from `end_date` in their head, and then judge whether the checkout time warrants counting the last day. Surface the stay length as a small tag on both surfaces so it's immediately visible.

This change also standardizes the date-format convention for the app: raw ISO dates (`YYYY-MM-DD`) in user-facing surfaces are reformatted to `dd/mm/yyyy`, because the Spanish-locale operators the app serves read dates in that order. Locale-aware date headers that rely on month/weekday names keep their weekday and are only adjusted to use the `dd/MM/yyyy` numeric portion.

## Rule (days count)

Two cases:

1. **Single-day stay** (`start_date == end_date`) ⇒ always **1 day**, regardless of the times. A one-day drop-off is still a booking day from the kennel's point of view.
2. **Multi-day stay** (`end_date > start_date`) ⇒ count every full day between `start_date` and `end_date` (exclusive of the checkout day), plus one more if the pickup time is **strictly past 12:00** on the checkout day ("midday rule").

Examples:
- `2026-04-21 09:00` → `2026-04-21 12:00` ⇒ `1` day (single day).
- `2026-04-21 09:00` → `2026-04-21 23:00` ⇒ `1` day (single day).
- `2026-04-21 08:00` → `2026-04-22 12:00` ⇒ `1` day (one night, exactly-noon checkout = not past midday).
- `2026-04-21 08:00` → `2026-04-22 13:00` ⇒ `2` days (one night + late-checkout day).
- `2026-04-21 08:00` → `2026-04-23 10:00` ⇒ `2` days (two nights, checkout before noon).
- `2026-04-21 08:00` → `2026-04-23 15:00` ⇒ `3` days (two nights + late-checkout day).
- `2026-04-21 18:00` → `2026-04-23 10:00` ⇒ `2` days (cross-day times — now permitted by the `schedule-cross-day-times` change; the helper ignores `start_time`, so the same-date-range booking counts the same whether drop-off is morning or evening).

## Scope

### In scope

- A pure helper `computeStayDays(startDate, endDate, endTime)` in `frontend/src/domain/schedules/` that implements the rule above.
- A small pill tag rendered in two places:
  - `DaySchedule.tsx` (the day sidebar on the calendar page) next to the conflicts tag.
  - `ScheduleDetailsPopup.tsx` next to the status badge at the top.
- The tag uses a primary-tinted palette (`bg-primary/10 text-primary border-primary/20`) — visible and readable without competing with status/conflict badges.
- Translations: `schedule.dayCount.one` / `schedule.dayCount.other` in both `en` and `es`, interpolated via `{count}` for plurality.
- A shared `formatIsoDate(iso)` helper in `@/lib/dateLocale` that renders a `YYYY-MM-DD` string as `dd/mm/yyyy`. Applied to:
  - The Date field in `ScheduleDetailsPopup.tsx`.
  - The multi-day `(start to end)` annotation in `DaySchedule.tsx`.
  - The owner birth-date line in `OwnerDetailsPopup.tsx`.
- The day sidebar header goes from `EEEE, MMMM d, yyyy` to `EEEE, dd/MM/yyyy` (`martes, 21/04/2026`) — keeps the localized weekday, switches the numeric portion to dd/mm/yyyy.
- The week view header goes from `MMM d - MMM d, yyyy` to `dd/MM - dd/MM/yyyy`.

### Out of scope

- Changing the underlying data model. Everything needed (`start_date`, `end_date`, `end_time`, `birth_date`) is already on the existing payloads.
- Alternate boarding-day rules (half-days, hourly billing, business-day exceptions). If the kennel wants those later it can layer a configuration flag on top of the same helper.
- The month-title header (`MMMM yyyy`, e.g. `abril 2026`) on the calendar month view — this is a month label, not a date, and the dd/mm/yyyy rule does not apply.
- Form inputs (`<input type="date" />`). Those render their own locale-aware picker and shouldn't be reformatted client-side.

## Approach

1. Add `frontend/src/domain/schedules/stayDays.ts` exporting `computeStayDays`. Strings are the ISO values already on the wire (`yyyy-MM-dd` + `HH:mm:ss`); the helper uses `Date.UTC`-based math to avoid DST / timezone drift and short-circuits on single-day stays.
2. Add `formatIsoDate(iso)` inside `frontend/src/lib/dateLocale.ts`. Null-safe — returns `''` on missing input, returns the input unchanged if the shape doesn't match.
3. Add `schedule.dayCount.one` / `schedule.dayCount.other` translation keys with `{count}` interpolation.
4. Render the pill in `DaySchedule.tsx` and `ScheduleDetailsPopup.tsx` using the primary-tinted palette.
5. Replace raw `{schedule.start_date}` / `{schedule.end_date}` / `{owner.birth_date}` display usages with `formatIsoDate(...)`. Adjust the two date-fns formatting calls in `DaySchedule.tsx` and `WeekView.tsx` that drive the day and week headers.
