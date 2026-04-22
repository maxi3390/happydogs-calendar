# MODIFIED: Frontend / Schedules

## ADDED Requirements

### Requirement: Schedule form end-time dropdown mirrors the backend rule

The end-time `<select>` in `frontend/src/components/ScheduleForm.tsx` SHALL filter its options based on whether the schedule is a single-day or multi-day booking, matching the relaxed backend validator (`ScheduleCreateSerializer` / `BatchScheduleCreateSerializer`) so operators can actually pick legitimate cross-day pickup times.

- **When `startDate === endDate` (single-day booking):** the end-time dropdown SHALL offer only the `TIME_OPTIONS` values strictly greater than `startTime`. Operators cannot pick an end time that is before or equal to the start time on the same day.
- **When `endDate > startDate` (multi-day booking):** the end-time dropdown SHALL offer every `TIME_OPTIONS` value. The start time of the drop-off day does not constrain the pickup time on a later day.

Date fields (start-date and end-date pickers) are unaffected.

#### Scenario: Single-day schedule filters end-time to "after start"

- GIVEN the schedule form with `startDate == endDate` and `startTime = 10:00`
- WHEN the operator opens the end-time dropdown
- THEN the dropdown SHALL NOT show `09:00`, `10:00`, or any value `<= 10:00`
- AND it SHALL show `11:00`, `12:00`, … through the last option

#### Scenario: Multi-day schedule shows all end-time options

- GIVEN the schedule form with `startDate = 2026-04-21`, `endDate = 2026-04-23`, `startTime = 18:00`
- WHEN the operator opens the end-time dropdown
- THEN the dropdown SHALL show every `TIME_OPTIONS` value, including `08:00`, `10:00`, etc.
- AND picking a value like `10:00` SHALL leave that selection in place (no silent revert)

#### Scenario: Switching from multi-day to single-day re-applies the filter

- GIVEN a multi-day schedule with `startTime = 18:00`, `endTime = 10:00`
- WHEN the operator changes `endDate` to equal `startDate`
- THEN the end-time dropdown SHALL re-filter to options strictly greater than `startTime`
- AND the currently-selected `10:00` (now invalid for a single-day booking) SHALL no longer be offered
