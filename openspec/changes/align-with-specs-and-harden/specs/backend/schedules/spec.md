# Delta for Backend Schedules

## MODIFIED Requirements

### Requirement: Daily Count Endpoint

The daily count endpoint SHALL return the configured daily booking limit in a field named `daily_booking_limit` (not `limit`).

#### Scenario: Response field naming

- GIVEN an authenticated user queries the daily count endpoint for a given date
- WHEN the response is returned
- THEN the response body SHALL include the fields: `date`, `count`, `daily_booking_limit`, `limit_reached`, `limit_exceeded`
- AND the field name SHALL be `daily_booking_limit` (not `limit`)

### Requirement: Conflict Detection Reports All Triggered Rules

Each detected conflict SHALL list every triggered incompatibility rule, not just the first one.

#### Scenario: Multiple rules triggered in a schedule conflict

- GIVEN two overlapping schedules involving pets that trigger multiple compatibility rules
- WHEN the conflict check endpoint is called
- THEN each returned conflict SHALL include both a `reason` field (first triggered rule, for backward compatibility) and a `reasons` list (all triggered rules)

### Requirement: Zero-Duration Schedule Rejected

The system SHALL reject schedule creation or update when `start_time` equals `end_time`.

#### Scenario: Zero-duration schedule rejected

- GIVEN an authenticated user submits a schedule with `start_time == end_time`
- WHEN the creation or update request is processed
- THEN the system SHALL reject the request with a validation error
- AND the error message SHALL indicate that end time must be strictly after start time
