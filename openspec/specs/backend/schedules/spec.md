# Schedule Management Specification

## Purpose

This specification defines the behavior for managing schedules within the pet nursery management system. It covers the full lifecycle of schedule records including creation, retrieval, updating, deletion, conflict detection, daily summary and count reporting, batch creation, and list filtering. Schedules represent bookings for pets at the nursery and support multi-day date ranges with time windows. All schedule management endpoints require authentication.

## Requirements

### Requirement: Schedule Creation

The system SHALL allow authenticated users to create schedule records. A schedule MUST be associated with a pet. A schedule MUST include a start date, end date, start time, and end time. A schedule MAY include a status and notes. If no status is provided, the system SHALL default to a scheduled status.

#### Scenario: Create a Schedule With All Required Fields

- Given an authenticated user provides a valid pet identifier, start date, end date, start time, and end time
- When the user submits the schedule creation request
- Then the system SHALL create a new schedule record associated with the specified pet
- And the system SHALL return the created schedule details
- And the status SHALL default to scheduled

#### Scenario: Create a Schedule With Explicit Status

- Given an authenticated user provides valid schedule data along with a status of checked_in
- When the user submits the schedule creation request
- Then the system SHALL create the schedule with the specified status

#### Scenario: Create a Schedule With Notes

- Given an authenticated user provides valid schedule data along with notes
- When the user submits the schedule creation request
- Then the system SHALL create the schedule record with the provided notes

#### Scenario: Create a Multi-Day Schedule

- Given an authenticated user provides a start date of Monday and an end date of Friday
- When the user submits the schedule creation request
- Then the system SHALL create a schedule spanning from Monday to Friday

#### Scenario: Create a Schedule With Missing Required Fields

- Given an authenticated user omits one or more required fields (pet, start date, end date, start time, or end time)
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error identifying the missing fields

#### Scenario: Create a Schedule Without Authentication

- Given an unauthenticated visitor attempts to create a schedule
- When the visitor submits the schedule creation request
- Then the system SHALL reject the request with an authentication error

### Requirement: Schedule Attributes and Validation

The system SHALL enforce the following attribute constraints for schedule records:

- **Pet** SHALL be a reference to an existing pet record (foreign key).
- **Start date** and **end date** SHALL be valid dates. The start date MUST be before or equal to the end date.
- **Start time** and **end time** SHALL be valid times. The start time MUST be strictly before the end time; a zero-duration window (start time equal to end time) is invalid and MUST be rejected.
- **Status** SHALL be one of: scheduled, checked_in, completed, or cancelled.
- **Notes** MAY be optionally provided as free text.

#### Scenario: Create a Schedule With Start Time After End Time

- Given an authenticated user provides a start time of 14:00 and an end time of 10:00
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error indicating start time must be before end time

#### Scenario: Create a Schedule With Equal Start and End Time (Zero-Duration)

- Given an authenticated user provides a start time of 10:00 and an end time of 10:00
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error indicating start time must be strictly before end time
- And the schedule SHALL NOT be created

#### Scenario: Create a Schedule With Start Date After End Date

- Given an authenticated user provides a start date after the end date
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error indicating start date must be before or equal to end date

#### Scenario: Create a Schedule With Equal Start and End Date

- Given an authenticated user provides the same date for both start date and end date
- When the user submits the schedule creation request
- Then the system SHALL accept the request as a single-day schedule

#### Scenario: Create a Schedule With Invalid Status

- Given an authenticated user provides a status value not in the allowed list
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error for the status field

#### Scenario: Create a Schedule for a Non-Existent Pet

- Given an authenticated user provides a pet identifier that does not exist
- When the user submits the schedule creation request
- Then the system SHALL reject the request with a validation error for the pet field

### Requirement: Schedule Listing and Filtering

The system SHALL allow authenticated users to retrieve a list of schedule records. The system SHALL support filtering the list by date, date range (start_date and end_date), pet identifier, and status.

#### Scenario: List All Schedules

- Given an authenticated user requests the list of schedules without any filters
- When the system processes the request
- Then the system SHALL return all schedule records

#### Scenario: Filter Schedules by Specific Date

- Given an authenticated user provides a date filter
- When the system processes the request
- Then the system SHALL return only schedules that fall on the specified date

#### Scenario: Filter Schedules by Date Range

- Given an authenticated user provides a start_date and end_date range filter
- When the system processes the request
- Then the system SHALL return only schedules that overlap with the specified date range

#### Scenario: Filter Schedules by Pet

- Given an authenticated user provides a pet identifier filter
- When the system processes the request
- Then the system SHALL return only schedules associated with the specified pet

#### Scenario: Filter Schedules by Status

- Given an authenticated user provides a status filter of completed
- When the system processes the request
- Then the system SHALL return only schedules with a status of completed

#### Scenario: Combine Multiple Filters

- Given an authenticated user provides both a date range filter and a status filter
- When the system processes the request
- Then the system SHALL return only schedules matching all provided filter criteria

#### Scenario: List Schedules When No Schedules Exist

- Given an authenticated user requests the list of schedules and no schedule records exist
- When the system processes the request
- Then the system SHALL return an empty list

### Requirement: Schedule Retrieval

The system SHALL allow authenticated users to retrieve the full details of a single schedule by its identifier.

#### Scenario: Retrieve an Existing Schedule

- Given an authenticated user requests a schedule by a valid identifier
- When the system processes the request
- Then the system SHALL return the full schedule details

#### Scenario: Retrieve a Non-Existent Schedule

- Given an authenticated user requests a schedule by an identifier that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Schedule Updating

The system SHALL allow authenticated users to update an existing schedule record. All mutable fields (pet, start date, end date, start time, end time, status, and notes) SHALL be updatable. Validation rules for dates, times, and status MUST still be enforced during updates.

#### Scenario: Update Schedule Fields

- Given an authenticated user provides updated values for a schedule's fields
- When the user submits the schedule update request
- Then the system SHALL update the schedule record with the new values
- And the system SHALL return the updated schedule details

#### Scenario: Update Schedule Status to Cancelled

- Given an authenticated user changes a schedule's status to cancelled
- When the user submits the schedule update request
- Then the system SHALL update the status to cancelled

#### Scenario: Update a Non-Existent Schedule

- Given an authenticated user attempts to update a schedule that does not exist
- When the user submits the schedule update request
- Then the system SHALL return a not-found error

#### Scenario: Update Schedule With Invalid Time Range

- Given an authenticated user updates a schedule with a start time after the end time
- When the user submits the schedule update request
- Then the system SHALL reject the request with a validation error

### Requirement: Schedule Deletion

The system SHALL allow authenticated users to delete a schedule record by its identifier.

#### Scenario: Delete an Existing Schedule

- Given an authenticated user requests deletion of an existing schedule
- When the system processes the request
- Then the system SHALL delete the schedule record

#### Scenario: Delete a Non-Existent Schedule

- Given an authenticated user requests deletion of a schedule that does not exist
- When the system processes the request
- Then the system SHALL return a not-found error

### Requirement: Pet Deletion Cascades to Schedules

When a pet is deleted, all schedules associated with that pet MUST be deleted automatically through cascade deletion.

#### Scenario: Pet Deletion Cascades to Schedules

- Given a pet has multiple associated schedules
- When the pet is deleted
- Then all schedule records associated with that pet SHALL be deleted automatically
- And no orphaned schedule records SHALL remain

### Requirement: Conflict Detection

The system SHALL detect scheduling conflicts when creating or updating schedules. A conflict exists when two schedules overlap in both date range AND time range, and both schedules have an active status (scheduled or checked_in). Conflicts are WARNINGS only — the system SHALL always create or update the schedule regardless of detected conflicts. The system SHALL return any detected conflicts as warnings alongside the created or updated schedule.

Each entry in the returned conflict list SHALL include:

- A `reason` field: a short string describing the first triggered conflict rule, preserved for backward compatibility with earlier clients.
- A `reasons` field: a list of every triggered conflict rule for that overlap (e.g. same-pet overlap, cross-pet overlap, daily-limit reached, pet-compatibility violation). Clients SHOULD prefer reading `reasons` over `reason`.

The two fields SHALL always be consistent: `reason` equals `reasons[0]` when `reasons` is non-empty.

#### Scenario: Create a Schedule With a Conflict

- Given an existing schedule for pet A on Monday from 09:00 to 12:00 with status scheduled
- And an authenticated user creates a new schedule for pet B on Monday from 10:00 to 14:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHALL return a warning indicating a conflict with the existing schedule

#### Scenario: Create a Schedule Without Conflicts

- Given an existing schedule for pet A on Monday from 09:00 to 12:00
- And an authenticated user creates a new schedule for pet B on Monday from 13:00 to 16:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHALL NOT return any conflict warnings

#### Scenario: Cancelled Schedule Does Not Cause Conflict

- Given an existing schedule for pet A on Monday from 09:00 to 12:00 with status cancelled
- And an authenticated user creates a new schedule for pet B on Monday from 10:00 to 14:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHALL NOT return a conflict warning for the cancelled schedule

#### Scenario: Completed Schedule Does Not Cause Conflict

- Given an existing schedule for pet A on Monday from 09:00 to 12:00 with status completed
- And an authenticated user creates a new schedule for pet B on Monday from 10:00 to 14:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHALL NOT return a conflict warning for the completed schedule

#### Scenario: Overlapping Date Ranges But Non-Overlapping Times Do Not Conflict

- Given an existing schedule for pet A on Monday from 09:00 to 12:00 with status scheduled
- And an authenticated user creates a new schedule for pet B on Monday from 12:00 to 15:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHOULD evaluate whether the times overlap based on the system's overlap logic

#### Scenario: Multi-Day Schedule Conflict Detection

- Given an existing schedule for pet A from Monday to Wednesday, 09:00 to 17:00 with status scheduled
- And an authenticated user creates a new schedule for pet B from Tuesday to Thursday, 10:00 to 16:00
- When the user submits the schedule creation request
- Then the system SHALL create the new schedule
- And the system SHALL return a warning indicating a conflict (overlapping date range Tuesday-Wednesday and overlapping time range 10:00-16:00)

### Requirement: Conflict Check Endpoint

The system SHALL provide a pre-flight conflict check endpoint that determines whether a proposed schedule would conflict with existing schedules, without actually creating the schedule. The endpoint SHALL accept the same date and time parameters as schedule creation. The endpoint SHALL support an optional exclude_schedule_id parameter to exclude a specific schedule from conflict detection, enabling conflict checks during schedule edits.

#### Scenario: Pre-Flight Conflict Check With Conflicts

- Given existing schedules on Monday from 09:00 to 12:00 with active status
- When an authenticated user requests a conflict check for Monday from 10:00 to 14:00
- Then the system SHALL return the list of conflicting schedules
- And no schedule SHALL be created

#### Scenario: Pre-Flight Conflict Check Without Conflicts

- Given existing schedules on Monday from 09:00 to 12:00
- When an authenticated user requests a conflict check for Monday from 13:00 to 16:00
- Then the system SHALL return an empty conflict list
- And no schedule SHALL be created

#### Scenario: Conflict Check Excluding a Specific Schedule

- Given schedule X exists on Monday from 09:00 to 12:00
- And schedule Y exists on Monday from 11:00 to 14:00
- When an authenticated user requests a conflict check for Monday 09:00 to 12:00 with exclude_schedule_id set to schedule X's identifier
- Then the system SHALL exclude schedule X from conflict evaluation
- And the system SHALL return schedule Y as a conflict if it overlaps

#### Scenario: Conflict Check Excluding the Schedule Being Edited

- Given schedule X exists on Monday from 09:00 to 12:00 and no other overlapping schedules exist
- When an authenticated user requests a conflict check for Monday 09:00 to 13:00 with exclude_schedule_id set to schedule X's identifier
- Then the system SHALL exclude schedule X from conflict evaluation
- And the system SHALL return an empty conflict list

### Requirement: Daily Summary Endpoint

The system SHALL provide a daily summary endpoint that returns the count of schedules grouped by status for a given date.

#### Scenario: Retrieve Daily Summary

- Given schedules exist on a specific date with 3 scheduled, 2 checked_in, 1 completed, and 1 cancelled
- When an authenticated user requests the daily summary for that date
- Then the system SHALL return the counts: scheduled=3, checked_in=2, completed=1, cancelled=1

#### Scenario: Daily Summary for a Date With No Schedules

- Given no schedules exist on a specific date
- When an authenticated user requests the daily summary for that date
- Then the system SHALL return zero counts for all statuses

### Requirement: Daily Count Endpoint

The system SHALL provide a daily count endpoint that returns the total number of active schedules for a given date, the configured daily booking limit, and flags indicating whether the limit has been reached or exceeded.

The response SHALL include the following fields:

- `date` — the date the counts apply to.
- `count` — the total number of active schedules on that date.
- `daily_booking_limit` — the configured daily booking limit (this field is named `daily_booking_limit`; it is NOT named `limit`).
- `limit_reached` — true when `count` equals `daily_booking_limit`, otherwise false.
- `limit_exceeded` — true when `count` is strictly greater than `daily_booking_limit`, otherwise false.

#### Scenario: Daily Count Below Limit

- Given 5 active schedules exist on a specific date and the daily booking limit is 10
- When an authenticated user requests the daily count for that date
- Then the system SHALL return count=5, daily_booking_limit=10, limit_reached=false, limit_exceeded=false

#### Scenario: Daily Count At Limit

- Given 10 active schedules exist on a specific date and the daily booking limit is 10
- When an authenticated user requests the daily count for that date
- Then the system SHALL return count=10, daily_booking_limit=10, limit_reached=true, limit_exceeded=false

#### Scenario: Daily Count Exceeds Limit

- Given 12 active schedules exist on a specific date and the daily booking limit is 10
- When an authenticated user requests the daily count for that date
- Then the system SHALL return count=12, daily_booking_limit=10, limit_reached=false, limit_exceeded=true

#### Scenario: Daily Count With No Schedules

- Given no active schedules exist on a specific date and the daily booking limit is 10
- When an authenticated user requests the daily count for that date
- Then the system SHALL return count=0, daily_booking_limit=10, limit_reached=false, limit_exceeded=false

### Requirement: Batch Schedule Creation

The system SHALL provide a batch creation endpoint that allows creating schedules for multiple pets at once with the same date, time, and other parameters. The system SHALL return the total count of successfully created schedules and per-pet warnings for any detected conflicts.

#### Scenario: Batch Create Schedules for Multiple Pets

- Given an authenticated user provides a list of 3 pet identifiers along with a date range, time range, and status
- When the user submits the batch schedule creation request
- Then the system SHALL create one schedule for each specified pet
- And the system SHALL return a created count of 3

#### Scenario: Batch Create With Some Conflicts

- Given an authenticated user provides a list of 3 pet identifiers
- And one of the pets already has a conflicting schedule at the specified date and time
- When the user submits the batch schedule creation request
- Then the system SHALL create schedules for all 3 pets (conflicts are warnings, not blockers)
- And the system SHALL return a created count of 3
- And the system SHALL return per-pet warnings indicating which pets have conflicting schedules

#### Scenario: Batch Create With No Pets

- Given an authenticated user provides an empty list of pet identifiers
- When the user submits the batch schedule creation request
- Then the system SHALL return a created count of 0

#### Scenario: Batch Create With Invalid Pet Identifier

- Given an authenticated user provides a list of pet identifiers where one identifier does not correspond to an existing pet
- When the user submits the batch schedule creation request
- Then the system SHALL reject the request with a validation error for the invalid pet identifier

### Requirement: Authentication Enforcement

All schedule management endpoints MUST require authentication. Any request from an unauthenticated visitor SHALL be rejected with an authentication error.

#### Scenario: Unauthenticated Access to Any Schedule Endpoint

- Given an unauthenticated visitor
- When the visitor attempts to access any schedule management endpoint (list, create, retrieve, update, delete, conflict check, daily summary, daily count, or batch create)
- Then the system SHALL reject the request with an authentication error
## Requirements (added via conflict-detection-improvements)

### Requirement: `check_conflicts` response SHALL include a `reason_groups` collation

The response from `POST /api/schedules/check_conflicts/` (and the embedded `warnings` field on the create response) SHALL expose a new `reason_groups` field alongside the existing `conflicts` array. Each entry in `reason_groups` SHALL have:

```
{
  "reason": "<the reason text>",
  "pets": [
    { "id": <int>, "name": "<str>", "time_slot": "<HH:MM-HH:MM>", "date_range": "<str>" }
  ]
}
```

A reason that fires across multiple overlapping pets SHALL appear as a SINGLE `reason_groups` entry whose `pets` list contains every affected overlapping pet, instead of one row per pet.

When two or more distinct reasons fire for the same overlapping pet, each reason SHALL be a separate `reason_groups` entry.

The existing `conflicts` array SHALL continue to be emitted for backwards compatibility and SHALL be marked deprecated in the OpenAPI schema. Frontend consumers SHALL prefer `reason_groups` when present.

The `reason` field of every entry in `reason_groups` (and the legacy `conflicts[].reason` / `conflicts[].reasons[]` fields) SHALL be either a translation key from the catalog defined in `backend/pets`'s "Compatibility reasons SHALL be returned as i18n keys" requirement, OR the literal `reason` text of a `PetIncompatibility` row for a custom rule. Hardcoded-rule entries SHALL NOT carry their English warning text in this field.

#### Scenario: One reason across many overlaps collapses

- GIVEN an aggressive pet is being scheduled
- AND three other pets have overlapping schedules
- WHEN the conflict check runs
- THEN `reason_groups` SHALL contain exactly one entry with `reason = "schedule.conflictReasons.aggressive"`
- AND that entry's `pets` list SHALL contain three rows, one per overlapping pet
- AND `overlapping_pets_count` SHALL be `3`

#### Scenario: Two distinct reasons stay separate

- GIVEN a pet that triggers BOTH the aggressive rule AND the new rule 6 (same species + same sex + dominance ≥ 7) against the same single overlapping pet
- WHEN the conflict check runs
- THEN `reason_groups` SHALL contain TWO entries — one per reason
- AND each entry's `pets` list SHALL contain the single overlapping pet

#### Scenario: No conflicts

- GIVEN a pet that triggers no rules against any overlap
- WHEN the conflict check runs
- THEN `reason_groups` SHALL be an empty array
- AND `has_conflicts` SHALL be `false`

#### Scenario: Custom-rule reason in `reason_groups`

- GIVEN a persisted `PetIncompatibility` rule between pets A and B with `reason = "Vet advised separation"`
- AND pets A and B have overlapping schedules
- WHEN the conflict check runs for pet A
- THEN `reason_groups` SHALL contain an entry with `reason = "Vet advised separation"` and `pets = [{ B's projection }]`

### Requirement: Custom rules SHALL be gated by overlap

A persisted `PetIncompatibility` rule SHALL surface a warning ONLY when both pets it names actually overlap on the schedule being checked (same overlap criteria as the hardcoded rules: date range overlap AND time range overlap, and the other schedule's status is `scheduled` or `checked_in`). The mere existence of a rule in the catalog without an actual overlap SHALL NOT produce a warning.

#### Scenario: Catalog-only custom rule with no overlap is silent

- GIVEN a persisted custom rule between pets A and B
- AND pet B has NO schedule overlapping with the new schedule for pet A
- WHEN the conflict check runs for pet A
- THEN `has_conflicts` SHALL be `false`
- AND `reason_groups` SHALL NOT contain the custom rule's reason

#### Scenario: Custom rule with an overlap fires

- GIVEN a persisted custom rule between pets A and B
- AND pet B has a schedule that overlaps with the new schedule for pet A (same date range + time range, status active)
- WHEN the conflict check runs for pet A
- THEN `reason_groups` SHALL contain the custom rule's reason
- AND that entry's `pets` SHALL include pet B

