# MODIFIED: Frontend / Calendar

## ADDED Requirements

### Requirement: Monthly Calendar Sorts Overlapping Schedules By Greater Range First

When stacking overlapping schedules into rows for a given week, the monthly calendar SHALL sort the schedules by actual range (`end_date - start_date`) descending, with `start_date` ascending as a tie-breaker. The previous comparator only distinguished single-day from multi-day, which let a longer schedule lose its visible row to a shorter one that happened to come first in the API order.

#### Scenario: Longer multi-day schedule keeps a visible row across all its days

- GIVEN three overlapping multi-day schedules of different actual lengths
- AND the longest one starts a day later than the others (so a `start_date` sort would put it last)
- WHEN the calendar assigns rows for the week
- THEN the longer schedule SHALL be assigned a row strictly less than the shorter one
- AND the longer schedule SHALL render across every day it covers without being clamped out

#### Scenario: Equal-range schedules tie-break on start date

- GIVEN two overlapping schedules of the same range length
- WHEN the calendar assigns rows
- THEN the schedule with the earlier `start_date` SHALL be assigned the lower row

### Requirement: Monthly Calendar Overflow Indicator Reflects Actually-Hidden Bars

The "+N more" overflow indicator SHALL render when at least one schedule that crosses a given day has been clamped out by `MAX_VISIBLE_BARS`, regardless of how many other schedules also cross that day. The previous implementation derived the count from `dayBarCounts[col] - MAX_VISIBLE_BARS`, which was wrong on a day where a single high-row segment was the only bar (the result went negative and the indicator was never rendered).

#### Scenario: Day with a single high-row hidden segment shows the indicator

- GIVEN a multi-day schedule that landed at row >= `MAX_VISIBLE_BARS` because of overlap with other schedules on other days
- AND a day where this schedule is the only one crossing
- WHEN the monthly calendar renders
- THEN that day SHALL show a "+1 more" indicator
- AND clicking it SHALL expand the week (see "Per-week expand" below)

#### Scenario: Day with no hidden bars shows no indicator

- GIVEN a day with only schedules at rows < `MAX_VISIBLE_BARS`
- WHEN the calendar renders
- THEN no "+N more" indicator SHALL be rendered for that day

### Requirement: Clicking "+N more" Expands The Week In Place

The "+N more" indicator SHALL be a focusable, keyboard-activatable control. When activated, the calendar SHALL expand the entire week row in place — every overlapping schedule for that week renders inline at its assigned row, and "+N more" indicators are suppressed across the row. A "Show less" button SHALL appear at the bottom of the expanded week and collapse the row when activated. Other weeks SHALL stay in their default compact layout.

The expanded state SHALL live in component-local state and SHALL reset to empty whenever the visible month changes.

#### Scenario: Click expands the week, suppresses indicators, grows cells

- GIVEN the operator is on the monthly calendar
- AND a week row has at least one "+N more" indicator
- WHEN the operator clicks any "+N more" indicator in that week
- THEN every schedule overlapping the week SHALL render inline as a bar
- AND no "+N more" indicators SHALL appear in that week
- AND the day cells in that week SHALL grow vertically to fit every row of bars
- AND other weeks SHALL be unchanged

#### Scenario: Click "Show less" collapses the week back

- GIVEN a week is expanded
- WHEN the operator clicks the "Show less" button at the bottom of that week
- THEN the row SHALL revert to the compact layout (max 3 visible bars + "+N more" indicators)

#### Scenario: Click does not also select the day cell underneath

- GIVEN the operator clicks a "+N more" indicator
- WHEN the click event propagates
- THEN the day-cell click handler underneath SHALL NOT fire
- AND the page-level "selected date" SHALL NOT change

#### Scenario: Navigating between months resets expansion

- GIVEN one or more weeks are expanded
- WHEN the operator navigates to a different month (next, previous, or "today")
- THEN every week SHALL render in the compact default
- AND returning to the original month SHALL also render the compact default (no persistence)

#### Scenario: Show-less button absent on a week with no hidden content

- GIVEN a week where no schedule was hidden
- WHEN the operator hypothetically expands the row (no-op in practice; nothing to expand)
- THEN no "Show less" button SHALL be rendered for that week

### Requirement: Calendar Layout Stays In The Month View

The expand / collapse interaction SHALL keep the operator on the monthly calendar — no view switch, no navigation, no modal popup. The DaySchedule panel and ScheduleDetailsPopup behaviours are unchanged.

#### Scenario: Expanding a week does not change the URL or the active view

- GIVEN the calendar is in monthly view
- WHEN the operator expands a week
- THEN the URL SHALL NOT change
- AND the calendar view selector SHALL still indicate "Month"
- AND the existing day-schedule panel and schedule-details popup SHALL behave as before
