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
