# MODIFIED: Frontend / Schedules

## ADDED Requirements

### Requirement: Stay length tag in day sidebar and details popup

The day sidebar on the calendar page (`DaySchedule.tsx`) and the schedule details popup (`ScheduleDetailsPopup.tsx`) SHALL each render a small pill-shaped tag showing the length of the stay in days, so the operator can tell at a glance whether a schedule is a drop-off or a multi-day boarding without doing mental date math.

The day count SHALL be computed as the number of calendar days between `start_date` and `end_date` (exclusive of the checkout day), plus one additional day if `end_time` is strictly greater than `12:00:00`. In words: count every day up to but not including checkout day, and add one more if the pet stays past midday on the way out.

#### Scenario: Short morning drop-off

- GIVEN a schedule with `start_date == end_date`, `start_time = 09:00`, `end_time = 12:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `0 days` (English) / `0 días` (Spanish)

#### Scenario: Same-day stay past midday

- GIVEN a schedule with `start_date == end_date`, `start_time = 09:00`, `end_time = 14:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `1 day` / `1 día`

#### Scenario: Multi-day stay with early checkout

- GIVEN a schedule from `2026-04-21` at `08:00` to `2026-04-23` at `10:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `2 days` / `2 días` (two full nights; checkout is before noon so the checkout day is not counted)

#### Scenario: Multi-day stay with late checkout

- GIVEN a schedule from `2026-04-21` at `08:00` to `2026-04-23` at `15:00`
- WHEN the day sidebar or details popup is rendered
- THEN the tag SHALL read `3 days` / `3 días` (two nights plus a late-checkout day)

#### Scenario: Visual treatment

- The tag SHALL render as a small rounded pill (`rounded-full`) with muted surface colors (e.g. `bg-secondary/40 text-muted-foreground`), so it reads as metadata rather than as a warning or status.
- On `DaySchedule.tsx` the tag SHALL sit adjacent to the existing conflicts pill in the schedule card header.
- On `ScheduleDetailsPopup.tsx` the tag SHALL sit next to the status badge in the header row.
