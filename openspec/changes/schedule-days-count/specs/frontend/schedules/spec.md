# MODIFIED: Frontend / Schedules

## ADDED Requirements

### Requirement: Stay length tag in day sidebar and details popup

The day sidebar on the calendar page (`DaySchedule.tsx`) and the schedule details popup (`ScheduleDetailsPopup.tsx`) SHALL each render a small pill-shaped tag showing the length of the stay in days, so the operator can tell at a glance whether a schedule is a drop-off or a multi-day boarding without doing mental date math.

The day count SHALL be computed as follows:

- **Single-day stays** (`start_date == end_date`) SHALL always count as **1 day**, regardless of the pickup time. A one-day drop-off is still a booking day.
- **Multi-day stays** SHALL count every full day between `start_date` and `end_date` (exclusive of the checkout day), plus one additional day if `end_time` is strictly greater than `12:00:00` on the checkout day ("midday rule").

#### Scenario: Single-day stay always counts as 1 day

- GIVEN a schedule with `start_date == end_date` and any `end_time` (e.g. `09:00`, `12:00`, `18:00`)
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `1 day` (English) / `1 día` (Spanish)

#### Scenario: Multi-day stay with early checkout

- GIVEN a schedule from `2026-04-21` at `08:00` to `2026-04-23` at `10:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `2 days` / `2 días` (two full nights; checkout is before noon so the checkout day is not counted)

#### Scenario: Multi-day stay with late checkout

- GIVEN a schedule from `2026-04-21` at `08:00` to `2026-04-23` at `15:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `3 days` / `3 días` (two nights plus a late-checkout day)

#### Scenario: Multi-day stay with checkout exactly at noon

- GIVEN a schedule from `2026-04-21` to `2026-04-22` with `end_time = 12:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `1 day` / `1 día` (noon is NOT strictly past midday, so the checkout day is not counted)

#### Scenario: Visual treatment

- The tag SHALL render as a small rounded pill (`rounded-full`) with a primary-tinted palette (e.g. `bg-primary/10 text-primary border-primary/20`) so it is visible and clearly readable, without competing with status or conflict indicators.
- On `DaySchedule.tsx` the tag SHALL sit adjacent to the existing conflicts pill in the schedule card header.
- On `ScheduleDetailsPopup.tsx` the tag SHALL sit next to the status badge in the header row.

### Requirement: Display raw ISO dates as dd/mm/yyyy

Raw ISO dates (`YYYY-MM-DD`) that were previously rendered verbatim in schedule-related UI SHALL be reformatted to `dd/mm/yyyy` for display, via a shared `formatIsoDate` helper in `@/lib/dateLocale`. The helper SHALL accept `null`/`undefined` defensively and return `''` in those cases.

#### Scenario: Schedule details popup Date field

- GIVEN a schedule with `start_date = 2026-04-21`, `end_date = 2026-04-23`
- WHEN the schedule details popup renders the Date field
- THEN the value SHALL read `21/04/2026 - 23/04/2026` (and `21/04/2026` for a single-day schedule)

#### Scenario: Day sidebar multi-day annotation

- GIVEN a schedule whose `start_date != end_date`
- WHEN it renders in the day sidebar under the time row
- THEN the `(start to end)` annotation SHALL read `(21/04/2026 - 23/04/2026)`

#### Scenario: Sidebar day header keeps the weekday

- GIVEN any calendar date
- WHEN the day sidebar renders its header
- THEN the header SHALL read `<weekday>, dd/MM/yyyy` with the weekday still localized (`martes, 21/04/2026` in Spanish, `Tuesday, 21/04/2026` in English)

#### Scenario: Week view header

- GIVEN the current week starts on `2026-04-20` and ends on `2026-04-26`
- WHEN the week view renders its header
- THEN the header SHALL read `{Week of} 20/04 - 26/04/2026`

The month-label header (`MMMM yyyy`, e.g. `abril 2026`) on the calendar month view is explicitly NOT affected — it is a month label, not a date value, and the date-format rule does not apply to it.
