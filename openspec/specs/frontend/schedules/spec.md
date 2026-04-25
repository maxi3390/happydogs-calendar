# Frontend Schedule Management Specification

## Purpose

Define the behavior of the schedule creation, editing, and management interface. This specification covers the single-pet schedule form, the multi-pet schedule form, real-time conflict detection, daily limit checks, schedule editing, status management, and schedule deletion.

## Requirements

### Requirement: Single-Pet Schedule Form

The system SHALL present a form for creating a schedule for one pet at a time, with real-time conflict detection and daily limit awareness.

#### Scenario: Opening the single-pet schedule form

- Given the user activates the "create schedule" action in single-pet mode
- When the form loads
- Then the system SHALL display a pet selection dropdown
- And the system SHALL display start date and end date input fields
- And the system SHALL display start time and end time input fields
- And the system SHALL display a status dropdown
- And the system SHALL display a notes textarea

#### Scenario: Selecting a pet

- Given the single-pet schedule form is open
- When the user selects a pet from the dropdown
- Then the system SHALL display supplementary pet information alongside the selection, including species, temperament, and dominance level
- And this information SHALL help the user assess scheduling compatibility

#### Scenario: Pet information display after selection

- Given the user has selected a pet in the form
- When the selection is rendered
- Then the system SHALL show the pet's species
- And the system SHALL show the pet's temperament
- And the system SHALL show the pet's dominance level

#### Scenario: Date range input

- Given the single-pet schedule form is open
- When the user interacts with the date fields
- Then the system SHALL allow the user to select a start date
- And the system SHALL allow the user to select an end date
- And the end date MUST be on or after the start date

#### Scenario: Time range input with 15-minute intervals

- Given the single-pet schedule form is open
- When the user interacts with the time fields
- Then the system SHALL present time options in 15-minute intervals
- And the available times SHALL range from 00:00 to 23:45
- And the end time MUST be after the start time when start and end dates are the same

#### Scenario: Status selection

- Given the single-pet schedule form is open
- When the user interacts with the status dropdown
- Then the system SHALL present the available statuses: scheduled, checked_in, completed, cancelled

#### Scenario: Notes input

- Given the single-pet schedule form is open
- When the user enters text in the notes textarea
- Then the system SHALL accept multi-line free-text input

#### Scenario: Required fields validation

- Given the user is filling in the single-pet schedule form
- When the user attempts to submit without selecting a pet, start date, end date, start time, or end time
- Then the system SHALL prevent submission
- And the system SHALL indicate which required fields are missing

---

### Requirement: Real-Time Conflict Detection

The system SHALL detect scheduling conflicts in real time as the user fills in the schedule form, using a debounced check.

#### Scenario: Triggering conflict detection

- Given the user has selected a pet and entered date/time ranges in the schedule form
- When the user pauses input for 500 milliseconds (debounce threshold)
- Then the system SHALL query for potential conflicts with the specified pet, dates, and times

#### Scenario: Conflicts detected

- Given the conflict detection query has returned results
- When one or more conflicts are found
- Then the system SHALL display a warning section in the form
- And each conflict warning SHALL include the name of the conflicting pet
- And each conflict warning SHALL include the reason for the conflict

#### Scenario: No conflicts detected

- Given the conflict detection query has returned results
- When no conflicts are found
- Then the system SHALL NOT display any conflict warnings
- Or the system SHALL display a positive indicator confirming no conflicts

#### Scenario: Conflict detection during form changes

- Given the user changes the pet, date, or time after an initial conflict check
- When 500 milliseconds elapse since the last change
- Then the system SHALL re-run the conflict detection with the updated values
- And the displayed warnings SHALL update to reflect the new results

#### Scenario: Conflict detection with incomplete form data

- Given the user has not yet filled in all fields required for conflict detection (pet, start date, end date, start time, end time)
- When the debounce period elapses
- Then the system SHALL NOT trigger a conflict detection query

---

### Requirement: Daily Limit Check

The system SHALL check whether creating a schedule would exceed the daily capacity limit and present an override option if so.

#### Scenario: Schedule within daily limit

- Given the user submits a schedule form
- When the daily schedule count for the requested date(s) is within the allowed limit
- Then the system SHALL proceed with schedule creation normally

#### Scenario: Schedule exceeds daily limit

- Given the user submits a schedule form
- When the daily schedule count for one or more requested dates would exceed the allowed limit
- Then the system SHALL display an override confirmation dialog
- And the dialog SHALL inform the user that the daily limit would be exceeded
- And the dialog SHALL present options to proceed with the override or cancel

#### Scenario: User confirms daily limit override

- Given the daily limit override confirmation dialog is displayed
- When the user confirms the override
- Then the system SHALL submit the schedule with the override flag
- And the schedule SHALL be created despite exceeding the daily limit

#### Scenario: User cancels daily limit override

- Given the daily limit override confirmation dialog is displayed
- When the user cancels
- Then the system SHALL NOT create the schedule
- And the form SHALL remain open with the current data preserved

---

### Requirement: Single-Pet Schedule Form - Result Screen

The system SHALL display a result screen after a single-pet schedule is successfully created.

#### Scenario: Successful creation result

- Given the user has submitted the single-pet schedule form
- When the schedule is created successfully
- Then the system SHALL display a result screen
- And the result screen SHALL show the details of the created schedule
- And the result screen SHALL display any warnings (e.g., conflicts or daily limit overrides) associated with the creation

#### Scenario: Dismissing the result screen

- Given the result screen is displayed
- When the user dismisses the result screen
- Then the system SHALL close the form
- And the calendar SHALL refresh to reflect the newly created schedule

---

### Requirement: Multi-Pet Schedule Form

The system SHALL present a form for creating schedules for multiple pets at once, with owner-based filtering and bulk pet selection.

#### Scenario: Opening the multi-pet schedule form

- Given the user activates the "create schedule" action in multi-pet mode
- When the form loads
- Then the system SHALL display an owner filter dropdown
- And the system SHALL display a pet selection area with checkboxes
- And the system SHALL display "Select All" and "Clear All" controls
- And the system SHALL display the same date, time, status, and notes fields as the single-pet form

#### Scenario: Filtering pets by owner

- Given the multi-pet schedule form is open
- When the user selects an owner from the owner filter dropdown
- Then the pet checkbox list SHALL be filtered to show only pets belonging to the selected owner

#### Scenario: Selecting all pets

- Given the multi-pet schedule form is open and pets are displayed
- When the user activates the "Select All" control
- Then all currently visible pet checkboxes SHALL be checked
- And all selected pets SHALL appear as removable tags in the selected pets display area

#### Scenario: Clearing all pet selections

- Given one or more pets are selected in the multi-pet form
- When the user activates the "Clear All" control
- Then all pet checkboxes SHALL be unchecked
- And the selected pets tag display SHALL be empty

#### Scenario: Individual pet selection via checkbox

- Given the multi-pet schedule form is open
- When the user checks a pet's checkbox
- Then that pet SHALL appear as a tag in the selected pets display area
- When the user unchecks the same checkbox
- Then that pet's tag SHALL be removed from the display area

#### Scenario: Removing a pet via tag dismissal

- Given one or more pets are selected and displayed as tags
- When the user activates the remove control on a specific pet tag
- Then the pet SHALL be deselected
- And the pet's checkbox SHALL be unchecked
- And the tag SHALL be removed from the display area

#### Scenario: Date, time, status, and notes fields

- Given the multi-pet schedule form is open
- When the user interacts with the date, time, status, and notes fields
- Then the behavior SHALL be identical to the single-pet form (date range, 15-minute time intervals, status dropdown, multi-line notes)

#### Scenario: Required fields validation for multi-pet form

- Given the user is filling in the multi-pet schedule form
- When the user attempts to submit without selecting at least one pet, or without filling in start date, end date, start time, or end time
- Then the system SHALL prevent submission
- And the system SHALL indicate which requirements are not met

#### Scenario: Pre-selected owner and pets from owner view

- Given the user activated the multi-pet form from an owner's "Schedule all pets" action
- When the form loads
- Then the owner filter SHALL be pre-set to the originating owner
- And all of the owner's pets SHALL be pre-selected and displayed as tags

---

### Requirement: Multi-Pet Schedule Form - Result Screen

The system SHALL display a result screen after multi-pet schedules are successfully created.

#### Scenario: Successful multi-pet creation result

- Given the user has submitted the multi-pet schedule form
- When all schedules are created
- Then the system SHALL display a result screen
- And the result screen SHALL show the total count of schedules created
- And the result screen SHALL list any per-pet warnings (e.g., conflicts, daily limit overrides)

#### Scenario: Partial success in multi-pet creation

- Given the user has submitted the multi-pet schedule form
- When some schedules succeed and some fail
- Then the result screen SHALL clearly indicate which pets had schedules created successfully
- And the result screen SHALL clearly indicate which pets encountered errors, with the error details

#### Scenario: Dismissing the multi-pet result screen

- Given the result screen is displayed
- When the user dismisses the result screen
- Then the system SHALL close the form
- And the calendar SHALL refresh to reflect the newly created schedules

---

### Requirement: Schedule Editing

The system SHALL allow users to edit existing schedules via a pre-filled form.

#### Scenario: Opening the edit form for an existing schedule

- Given a schedule exists and the user activates the edit action (from the day schedule panel or other entry point)
- When the schedule form opens
- Then the form SHALL be pre-filled with the schedule's current data
- And the pet selection SHALL show the currently assigned pet
- And the date range SHALL reflect the current start and end dates
- And the time range SHALL reflect the current start and end times
- And the status SHALL reflect the current status
- And the notes field SHALL contain any existing notes

#### Scenario: Modifying schedule fields

- Given the edit form is open with pre-filled data
- When the user changes any field (pet, dates, times, status, notes)
- Then the system SHALL accept the changes
- And conflict detection SHALL re-run based on the updated values (following the same debounce rules)

#### Scenario: Submitting schedule edits

- Given the user has made changes to a schedule in edit mode
- When the user submits the form
- Then the system SHALL send the updated schedule data to the backend
- And upon success, the form SHALL close
- And the calendar and day schedule panel SHALL reflect the updated schedule

#### Scenario: Edit submission error

- Given the user submits schedule edits
- When the backend returns an error
- Then the system SHALL display an error message within the form
- And the form SHALL remain open so the user can correct the issue

---

### Requirement: Status Management

The system SHALL allow users to change a schedule's status through the day schedule panel with defined state transitions.

#### Scenario: Viewing the current status

- Given a schedule entry is displayed in the day schedule panel
- When the panel renders
- Then the schedule SHALL display its current status as a visible badge or label

#### Scenario: Changing status from scheduled to checked_in

- Given a schedule has the status "scheduled"
- When the user selects "checked_in" from the status dropdown
- Then the system SHALL update the schedule status to "checked_in"
- And the status display SHALL immediately reflect the change

#### Scenario: Changing status from checked_in to completed

- Given a schedule has the status "checked_in"
- When the user selects "completed" from the status dropdown
- Then the system SHALL update the schedule status to "completed"
- And the status display SHALL immediately reflect the change

#### Scenario: Changing status to cancelled

- Given a schedule has any active status (scheduled or checked_in)
- When the user selects "cancelled" from the status dropdown
- Then the system SHALL update the schedule status to "cancelled"
- And the status display SHALL immediately reflect the change

#### Scenario: Status update error

- Given the user attempts to change a schedule's status
- When the backend returns an error
- Then the system SHALL display an error message
- And the status SHALL revert to its previous value

---

### Requirement: Schedule Deletion

The system SHALL allow users to delete a schedule with a confirmation step.

#### Scenario: Initiating schedule deletion

- Given a schedule entry is displayed in the day schedule panel or schedule detail view
- When the user activates the delete action
- Then the system SHALL display a confirmation dialog warning that deletion is permanent

#### Scenario: Confirming schedule deletion

- Given the deletion confirmation dialog is displayed
- When the user confirms the deletion
- Then the system SHALL delete the schedule from the backend
- And the schedule SHALL be removed from the day schedule panel
- And the schedule bar SHALL be removed from the calendar view

#### Scenario: Cancelling schedule deletion

- Given the deletion confirmation dialog is displayed
- When the user cancels the deletion
- Then the schedule SHALL remain unchanged
- And the confirmation dialog SHALL close

#### Scenario: Deletion error

- Given the user confirms schedule deletion
- When the backend returns an error
- Then the system SHALL display an error message indicating the deletion failed
- And the schedule SHALL remain in the panel and calendar view

### Requirement: Same-Pet Overlap And Adjacency Detection On The Schedule Form

The schedule form (single-mode) SHALL detect, before submission, whether the selected pet already has a separate **active** schedule whose date range overlaps OR is immediately adjacent (one calendar day apart) to the form's current `[start_date, end_date]`. When detected, the form SHALL render a non-blocking info block naming the existing schedule's range and offer an "Edit existing schedule" control that hands off to the form in edit mode for the existing schedule, auto-focusing the date field the operator should adjust.

The detection SHALL exclude the schedule currently being edited (in edit mode) and SHALL ignore schedules whose status is `completed` or `cancelled`.

#### Scenario: Adjacent forward (extending the existing schedule's end)

- GIVEN pet Luna already has an active schedule for 22 Apr to 25 Apr
- WHEN the operator opens the schedule form, picks Luna, and picks 26 Apr to 26 Apr
- THEN the form SHALL render the same-pet overlap block naming "22 Apr → 25 Apr"
- AND the block's "Edit existing schedule" control SHALL be present
- AND clicking the control SHALL close the create modal and open the form in edit mode for the existing 22–25 Apr schedule
- AND the `end_date` input SHALL be focused on mount

#### Scenario: Adjacent backward (extending the existing schedule's start)

- GIVEN pet Luna already has an active schedule for 22 Apr to 25 Apr
- WHEN the operator picks Luna and picks 21 Apr to 21 Apr
- THEN the form SHALL render the same-pet overlap block
- AND clicking the control SHALL open the existing schedule in edit mode
- AND the `start_date` input SHALL be focused on mount

#### Scenario: Overlap that extends forward

- GIVEN pet Luna already has an active schedule for 22 Apr to 25 Apr
- WHEN the operator picks Luna and picks 24 Apr to 27 Apr
- THEN the form SHALL render the same-pet overlap block
- AND `focusField` SHALL be `end_date`

#### Scenario: Overlap that extends backward

- GIVEN pet Luna already has an active schedule for 22 Apr to 25 Apr
- WHEN the operator picks Luna and picks 20 Apr to 23 Apr
- THEN the form SHALL render the same-pet overlap block
- AND `focusField` SHALL be `start_date`

#### Scenario: Contained inside an existing schedule

- GIVEN pet Luna already has an active schedule for 22 Apr to 25 Apr
- WHEN the operator picks Luna and picks 23 Apr to 24 Apr
- THEN the form SHALL render the same-pet overlap block
- AND `focusField` SHALL be `end_date` (the default for ambiguous extensions)

#### Scenario: Multiple candidates resolve to the closest one

- GIVEN pet Luna has two active schedules: 22–25 Apr and 5–10 May
- WHEN the operator picks Luna and picks 26 Apr to 26 Apr
- THEN the form SHALL render the block for the 22–25 Apr schedule (the closer match)
- AND the 5–10 May schedule SHALL NOT be referenced

#### Scenario: Date clear of every existing schedule

- GIVEN pet Luna has an active schedule for 22 Apr to 25 Apr
- WHEN the operator picks Luna and picks 1 Jun to 1 Jun
- THEN no same-pet overlap block SHALL be rendered

#### Scenario: Detection skips the schedule being edited

- GIVEN the operator is editing pet Luna's 22–25 Apr schedule
- WHEN the operator changes the end date to 27 Apr
- THEN no same-pet overlap block SHALL be rendered for the schedule being edited
- AND IF Luna has another active schedule that overlaps the new range, that one SHALL be surfaced instead

#### Scenario: Detection skips completed and cancelled schedules

- GIVEN pet Luna has a completed (or cancelled) schedule for 22–25 Apr
- WHEN the operator picks Luna and picks 26 Apr
- THEN no same-pet overlap block SHALL be rendered

#### Scenario: Multi-mode form is unaffected

- GIVEN the schedule form is opened in multi-pet (`mode: 'multi'`) mode
- WHEN the operator selects pets and dates that would individually trigger same-pet overlap on the single-mode form
- THEN no same-pet overlap block SHALL be rendered (the multi-mode form does not run this detection)

#### Scenario: Block is non-blocking

- GIVEN the same-pet overlap block is visible
- WHEN the operator clicks the form's primary submit button anyway (instead of the "Edit existing schedule" link)
- THEN the form SHALL submit the new schedule normally
- AND the existing schedule SHALL be unchanged
## Requirements (added via conflict-detection-improvements)

### Requirement: Conflict warning UI SHALL render deduplicated reasons

The conflict-warning UI surfaced by the schedule form (single mode), the multi-mode batch result, and the day-schedule panel SHALL render its rows from the `reason_groups` field of the conflict check response when present. Each row corresponds to one reason and lists every overlapping pet that triggered it. When `reason_groups` is absent (older backend), the UI MAY fall back to the legacy `conflicts[]` array.

The UI SHALL NOT show multiple identical warnings differing only in the overlapping pet's name; that is the entire purpose of the dedup.

#### Scenario: Aggressive pet against three overlapping pets

- GIVEN an aggressive pet is being scheduled
- AND three other pets have overlapping schedules with no other rules firing
- AND the backend returned `reason_groups` with one entry whose `pets` list has three rows
- WHEN the conflict-warning banner renders
- THEN the banner SHALL show ONE row containing the aggressive-pets reason
- AND the row SHALL name all three overlapping pets (e.g. "Milo, Cleo, Nala")

#### Scenario: Two distinct reasons fire

- GIVEN a pet whose new schedule triggers two distinct reasons against the same overlapping pet
- AND the backend returned `reason_groups` with two entries
- WHEN the warning banner renders
- THEN the banner SHALL show TWO rows, one per reason
- AND each row SHALL name the same single overlapping pet

#### Scenario: Backwards-compat fallback

- GIVEN the backend response omits `reason_groups` (older deployment)
- AND the response includes the legacy `conflicts[]` array
- WHEN the warning banner renders
- THEN the banner MAY render one row per `conflicts[]` entry as it did before this change

#### Scenario: Custom-rule reason in the warning

- GIVEN the schedule triggers a persisted custom rule (via `reason_groups`)
- WHEN the warning banner renders
- THEN the banner SHALL display the custom rule's `reason` text verbatim
- AND it SHALL list the affected overlapping pet(s) the same way as for hardcoded rules

