# Delta for Frontend Calendar

## ADDED Requirements

### Requirement: Day Schedule Panel Lists All Scheduled Pets

The day schedule panel SHALL render every schedule returned by the backend for the selected date — single-day schedules, multi-day schedules whose range covers the selected date, and schedules at any status. The panel SHALL NOT apply an internal height cap or nested scroll container that hides entries from view; if the list is longer than the viewport, the outer page scroll SHALL handle overflow.

#### Scenario: Every same-day schedule is visible

- GIVEN the selected date has multiple schedules belonging to different pets
- WHEN the day schedule panel renders
- THEN every schedule SHALL be visible in the panel's list (no nested cap hides later entries)
- AND the panel's header SHALL show the count of schedules

#### Scenario: Multi-day schedules appear on each day they cover

- GIVEN a schedule with `start_date` earlier than the selected date and `end_date` later than or equal to the selected date
- WHEN the day schedule panel renders for the selected date
- THEN the schedule SHALL appear in the list for the selected date
- AND the row SHALL indicate the schedule's full date range

#### Scenario: Long list triggers page scroll, not nested scroll

- GIVEN the selected date has more schedules than fit inside the visible viewport
- WHEN the user scrolls to see the rest
- THEN the outer page scrollbar SHALL be responsible for that scroll
- AND the day panel SHALL NOT present an inner scrollbar around the list of schedules

### Requirement: New Schedule Action Lives In The Day Schedule Panel

The day schedule panel SHALL expose a "+ New Schedule" button in its header when the host page wires in an `onNewSchedule` callback. Activating the button SHALL open the schedule form pre-populated with the currently selected date. This is the primary entry point for creating schedules from the Calendar (home) page.

#### Scenario: Button visible when host page provides the callback

- GIVEN the Calendar (home) page passes an `onNewSchedule` callback to the day panel
- WHEN the panel renders for an authenticated user
- THEN a "+ New Schedule" button SHALL be visible in the panel's header

#### Scenario: Button hidden when no callback is provided

- GIVEN a host page mounts the day panel without an `onNewSchedule` callback
- WHEN the panel renders
- THEN no New Schedule button SHALL be visible

#### Scenario: Clicking the button pre-fills the selected date

- GIVEN the user has selected a specific day on the calendar
- WHEN the user activates the panel's "+ New Schedule" button
- THEN the schedule form SHALL open
- AND the form's `start_date` and `end_date` SHALL be pre-populated with the selected day
