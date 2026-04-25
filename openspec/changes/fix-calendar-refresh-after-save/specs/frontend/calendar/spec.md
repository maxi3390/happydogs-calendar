# MODIFIED: Frontend / Calendar

## ADDED Requirements

### Requirement: Calendar And Week Views Refresh On Schedule Mutations

The monthly calendar grid (`Calendar`) and the weekly view (`WeekView`) SHALL re-fetch the schedules they paint whenever the page-level "refresh counter" increments. The counter is the same one already consumed by the `DaySchedule` panel, so a single mutation (create / edit / delete a schedule) refreshes every authenticated calendar surface in a single tick.

The contract is implemented as an optional `refreshTrigger?: number` prop on both calendar components. When omitted (e.g. on the unauthenticated `PublicCalendar` path), the component MUST default to a stable value and continue to fetch only when the visible period changes — preserving the existing public-calendar behaviour.

#### Scenario: Editing a schedule from the day-schedule panel updates the month view

- GIVEN the operator is on the home page with the monthly calendar visible
- AND the calendar shows a schedule bar for pet "Luna" on day 14, 09:00–11:00
- WHEN the operator clicks the edit pencil in the day-schedule panel for that schedule
- AND changes the start time to 10:00 in the schedule edit form
- AND saves the form
- THEN the day-schedule panel SHALL reflect the new start time
- AND the schedule bar on day 14 SHALL also reflect the new start time without the operator navigating between months or reloading the page

#### Scenario: Editing a schedule from the day-schedule panel updates the week view

- GIVEN the operator has switched the home page to the weekly view
- AND a schedule bar exists for pet "Luna" on Tuesday, 09:00–11:00
- WHEN the operator edits that schedule and saves
- THEN the week view's schedule bar SHALL reflect the post-edit values without manual navigation or reload

#### Scenario: Creating a schedule appears immediately on both views

- GIVEN the operator is on the home page (either monthly or weekly view)
- WHEN the operator opens the schedule form via the day-schedule panel and submits a new schedule for the visible period
- THEN the new bar SHALL appear on the calendar / week view immediately on save, without manual navigation

#### Scenario: Deleting a schedule disappears from both views

- GIVEN the operator is on the home page
- AND a schedule bar is visible on the calendar
- WHEN the operator deletes the schedule (via whichever surface exposes the delete action)
- THEN the bar SHALL disappear from the calendar / week view immediately on delete

#### Scenario: Public calendar is unaffected

- GIVEN the unauthenticated public calendar is rendered
- WHEN the underlying `Calendar` component is used without a `refreshTrigger` prop
- THEN the component SHALL fetch schedules only on mount and on period navigation
- AND no extra re-fetch SHALL be triggered by activity that does not touch the public surface
