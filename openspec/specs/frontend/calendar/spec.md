# Frontend Calendar Specification

## Purpose

Define the behavior of the calendar interface used to visualize and interact with pet nursery schedules. This specification covers the monthly view, weekly view, view toggling, schedule bar rendering, conflict indicators, day cells, schedule detail popups, the day schedule panel, the public (unauthenticated) calendar, and responsive layout adaptations.

## Requirements

### Requirement: Monthly View

The system SHALL display a monthly calendar grid that allows users to navigate months, select dates, and view schedule information at a glance.

#### Scenario: Rendering the monthly grid

- Given the user is viewing the calendar in monthly mode
- When the month view loads
- Then the system SHALL display a 7-column grid representing Sunday through Saturday
- And the system SHALL display column headers with day-of-week names
- And the system SHALL display day cells for every day of the currently selected month
- And days from the preceding and following months that fall within the displayed weeks SHALL be shown in a visually muted style

#### Scenario: Navigating to the previous month

- Given the user is viewing the monthly calendar
- When the user activates the "previous month" navigation control
- Then the system SHALL display the calendar for the month immediately before the currently displayed month
- And the month/year label SHALL update accordingly

#### Scenario: Navigating to the next month

- Given the user is viewing the monthly calendar
- When the user activates the "next month" navigation control
- Then the system SHALL display the calendar for the month immediately after the currently displayed month
- And the month/year label SHALL update accordingly

#### Scenario: Returning to the current month

- Given the user has navigated away from the current month
- When the user activates the "Today" button
- Then the system SHALL return the calendar to the month containing today's date
- And today's date SHALL be visually highlighted

#### Scenario: Selecting a date

- Given the user is viewing the monthly calendar
- When the user clicks or taps on a day cell
- Then the system SHALL mark that day as selected
- And the system SHALL display the day schedule panel for the selected date

---

### Requirement: Weekly View

The system SHALL display a weekly calendar grid showing individual pet schedule bars across days of the week.

#### Scenario: Rendering the weekly grid

- Given the user is viewing the calendar in weekly mode
- When the week view loads
- Then the system SHALL display a 7-column grid representing Monday through Sunday
- And the system SHALL display one row per pet that has schedules during the displayed week
- And each row SHALL show the pet's name as a row label
- And schedule bars SHALL span across the appropriate day columns

#### Scenario: Navigating to the previous week

- Given the user is viewing the weekly calendar
- When the user activates the "previous week" navigation control
- Then the system SHALL display the calendar for the week immediately before the currently displayed week

#### Scenario: Navigating to the next week

- Given the user is viewing the weekly calendar
- When the user activates the "next week" navigation control
- Then the system SHALL display the calendar for the week immediately after the currently displayed week

#### Scenario: Returning to the current week

- Given the user has navigated away from the current week
- When the user activates the "Today" button
- Then the system SHALL return the calendar to the week containing today's date

---

### Requirement: View Toggle

The system SHALL allow the user to switch between monthly and weekly calendar views.

#### Scenario: Switching from monthly to weekly view

- Given the user is viewing the monthly calendar
- When the user activates the weekly view toggle
- Then the system SHALL display the weekly view for the week containing the currently selected date (or today if no date is selected)
- And the toggle control SHALL indicate that weekly view is active

#### Scenario: Switching from weekly to monthly view

- Given the user is viewing the weekly calendar
- When the user activates the monthly view toggle
- Then the system SHALL display the monthly view for the month containing the currently displayed week
- And the toggle control SHALL indicate that monthly view is active

---

### Requirement: Schedule Bars

The system SHALL render schedule entries as colored horizontal bars within the calendar grid, with consistent per-pet coloring and support for overlapping schedules.

#### Scenario: Assigning a stable color to each pet

- Given schedules exist for multiple pets
- When the calendar renders schedule bars
- Then each pet SHALL be assigned a color from a rotating palette of 8 colors
- And the assigned color SHALL remain consistent for the same pet across all views and navigation actions

#### Scenario: Rendering a multi-day schedule bar

- Given a schedule spans more than one day
- When the calendar renders that schedule
- Then the schedule bar SHALL visually span across all days covered by the schedule
- And the bar SHALL have rounded corners on its start and end edges

#### Scenario: Rendering a single-day schedule bar

- Given a schedule covers only one day
- When the calendar renders that schedule
- Then the schedule bar SHALL be displayed within the single day cell
- And the bar SHALL have rounded corners on both edges

#### Scenario: Stacking overlapping schedule bars

- Given multiple schedules overlap on the same day(s)
- When the calendar renders those schedules
- Then the system SHALL stack the schedule bars vertically within the day cell
- And the system SHALL display a maximum of 3 visible schedule bars per day

#### Scenario: Overflow indicator for excess schedules

- Given more than 3 schedules overlap on the same day
- When the calendar renders that day
- Then the system SHALL display a "+N more" indicator where N is the count of hidden schedules
- And clicking the "+N more" indicator SHOULD reveal the full list of schedules for that day

#### Scenario: Clicking a schedule bar

- Given a schedule bar is displayed in the calendar
- When the user clicks or taps on the schedule bar
- Then the system SHALL open the schedule details popup for that schedule

---

### Requirement: Conflict Indicators

The system SHALL visually distinguish schedules that have associated conflicts.

#### Scenario: Displaying a conflicting schedule bar

- Given a schedule has one or more conflicts reported by the backend
- When the calendar renders that schedule bar
- Then the bar SHALL be displayed in an amber/warning color instead of the pet's assigned color
- And the bar SHALL display a warning icon to indicate the conflict

#### Scenario: Non-conflicting schedule bar

- Given a schedule has no conflicts
- When the calendar renders that schedule bar
- Then the bar SHALL be displayed in the pet's assigned color
- And no warning icon SHALL be shown

---

### Requirement: Day Cells

The system SHALL render individual day cells with date information, selection state, and today indicator.

#### Scenario: Displaying the date number

- Given a day cell is rendered in the calendar grid
- When the cell is visible
- Then the system SHALL display the numeric day of the month within the cell

#### Scenario: Indicating today's date

- Given today's date falls within the currently displayed calendar range
- When the calendar renders the day cell for today
- Then the system SHALL display a blue circle (or equivalent prominent visual indicator) around or behind the date number

#### Scenario: Indicating the selected date

- Given the user has selected a date
- When the calendar renders the day cell for the selected date
- Then the cell SHALL have a light blue background (or equivalent distinct visual treatment)

#### Scenario: Hover effects on day cells

- Given the user hovers their cursor over a day cell
- When the hover state is active
- Then the cell SHALL display a subtle hover effect to indicate interactivity

---

### Requirement: Schedule Details Popup

The system SHALL display a modal popup with detailed information about a schedule when a schedule bar is activated.

#### Scenario: Opening the schedule details popup

- Given a schedule bar is displayed on the calendar
- When the user clicks on the schedule bar
- Then the system SHALL display a modal popup
- And the popup SHALL show the pet's name
- And the popup SHALL show the schedule's status as a colored badge
- And the popup SHALL show the date and time range of the schedule

#### Scenario: Displaying pet details in the popup

- Given the schedule details popup is open
- When the popup renders
- Then the popup SHALL display a details grid containing the pet's species, temperament, size, and dominance level

#### Scenario: Displaying conflicts in the popup

- Given the schedule has associated conflicts
- When the schedule details popup is open
- Then the popup SHALL include a conflicts section listing each conflict
- And each conflict SHALL display the conflicting pet's name and the reason for the conflict

#### Scenario: Displaying notes in the popup

- Given the schedule has notes attached
- When the schedule details popup is open
- Then the popup SHALL display the notes content

#### Scenario: Schedule with no conflicts

- Given the schedule has no conflicts
- When the schedule details popup is open
- Then the conflicts section SHALL either be hidden or display a message indicating no conflicts

#### Scenario: Closing the schedule details popup

- Given the schedule details popup is open
- When the user clicks outside the popup, presses Escape, or activates the close control
- Then the popup SHALL close
- And the calendar view SHALL remain unchanged

---

### Requirement: Day Schedule Panel

The system SHALL display a panel listing all schedules for a selected day, with status management and action controls.

#### Scenario: Displaying the day schedule list

- Given the user has selected a day on the calendar
- When the day schedule panel loads
- Then the system SHALL display a scrollable list of all schedules for that day
- And each schedule entry SHALL show the pet's name, time range, and current status

#### Scenario: Changing a schedule's status

- Given a schedule entry is displayed in the day schedule panel
- When the user interacts with the status dropdown
- Then the system SHALL present the available statuses: scheduled, checked_in, completed, cancelled
- And when the user selects a new status, the system SHALL update the schedule's status
- And the status badge SHALL reflect the new status immediately

#### Scenario: Editing a schedule from the panel

- Given a schedule entry is displayed in the day schedule panel
- When the user activates the edit action
- Then the system SHALL open the schedule editing form pre-filled with the schedule's current data

#### Scenario: Deleting a schedule from the panel

- Given a schedule entry is displayed in the day schedule panel
- When the user activates the delete action
- Then the system SHALL display a confirmation dialog
- And if the user confirms, the system SHALL delete the schedule
- And the schedule SHALL be removed from the panel and the calendar

#### Scenario: Displaying conflict details in the panel

- Given a schedule in the day panel has conflicts
- When the panel renders that schedule
- Then the system SHALL display conflict information alongside the schedule entry
- And the conflict details SHALL include the conflicting pet's name and conflict reason

#### Scenario: Empty state for a day with no schedules

- Given the user selects a day that has no schedules
- When the day schedule panel loads
- Then the system SHALL display a message indicating that there are no schedules for the selected day

---

### Requirement: Public Calendar

The system SHALL display a simplified, read-only calendar view for unauthenticated users that shows aggregate availability information.

#### Scenario: Rendering the public calendar without authentication

- Given the user is not authenticated
- When the user views the home page
- Then the system SHALL display a calendar view that does not require authentication
- And the calendar SHALL NOT display individual schedule details or pet information

#### Scenario: Availability indicators per day

- Given the public calendar is displayed
- When the calendar renders day cells
- Then each day SHALL display a color-coded availability indicator
- And a green indicator SHALL represent available (few or no schedules)
- And a yellow indicator SHALL represent limited availability (moderate schedule count)
- And a red indicator SHALL represent busy (high schedule count, at or near capacity)

#### Scenario: Availability thresholds

- Given the system has defined thresholds for schedule counts
- When the calendar determines a day's availability color
- Then days at or below the lower threshold SHALL be green
- And days between the lower and upper thresholds SHALL be yellow
- And days at or above the upper threshold SHALL be red

#### Scenario: Displaying the availability legend

- Given the public calendar is displayed
- When the calendar renders
- Then the system SHALL display a legend explaining the meaning of the green, yellow, and red indicators

#### Scenario: No management actions on public calendar

- Given the user is not authenticated and viewing the public calendar
- When the user interacts with the calendar
- Then the system SHALL NOT provide schedule creation, editing, or deletion controls
- And the system SHALL NOT display the day schedule panel with management actions

---

### Requirement: Responsive Layout

The system SHALL adapt the calendar layout for different screen sizes, maintaining usability on mobile devices.

#### Scenario: Mobile layout hides day name headers

- Given the user is viewing the calendar on a small screen
- When the calendar renders
- Then the system SHALL hide or abbreviate the full day-of-week column headers to conserve space

#### Scenario: Compact day cells on mobile

- Given the user is viewing the calendar on a small screen
- When the calendar renders day cells
- Then the cells SHALL use a more compact layout
- And schedule bars MAY show fewer details (e.g., omitting pet names) to fit within the reduced space

#### Scenario: Calendar remains functional on mobile

- Given the user is on a mobile device
- When the user interacts with the calendar
- Then all navigation controls (previous, next, today) SHALL remain accessible
- And date selection SHALL work via tap gestures
- And the day schedule panel SHALL be accessible after selecting a date

---

### Requirement: Localized Day And Month Labels

All calendar surfaces (month calendar header, week view day labels and week range header, day schedule header, public availability calendar) SHALL render day names and month names in the application's active language. Machine-format date tokens (ISO dates like `yyyy-MM-dd`) SHALL remain locale-independent.

#### Scenario: Week view day names change with language

- GIVEN the user is viewing the week view in English
- WHEN the user switches the active language to Spanish
- THEN the day name abbreviations ("MON", "TUE", …) SHALL re-render as Spanish abbreviations
- AND the week range header (for example "Week of Apr 14 - Apr 20, 2026") SHALL re-render with Spanish month names

#### Scenario: Day schedule header changes with language

- GIVEN the user is viewing the day schedule for a given date
- WHEN the active language is Spanish
- THEN the full date header (day name, month name, day number, year) SHALL render in Spanish

#### Scenario: Month calendar header changes with language

- GIVEN the user is viewing the month calendar on the home page
- WHEN the active language is Spanish
- THEN the month-and-year header SHALL render as a Spanish month followed by the year

#### Scenario: Public availability calendar header changes with language

- GIVEN an unauthenticated visitor is viewing the public availability calendar
- WHEN the active language is Spanish
- THEN the month-and-year header SHALL render in Spanish

#### Scenario: Machine-format date tokens are locale-independent

- GIVEN a component formats a date for API consumption (for example `'yyyy-MM-dd'` in schedule range queries)
- WHEN the active language changes
- THEN the machine-format output SHALL remain identical across languages

---

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

---

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
