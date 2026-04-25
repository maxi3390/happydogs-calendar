# MODIFIED: Frontend / Schedules

## ADDED Requirements

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
