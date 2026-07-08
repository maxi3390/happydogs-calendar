# MODIFIED: Backend / Schedules

## MODIFIED Requirements

### Requirement: Schedule Listing and Filtering

The system SHALL provide a paginated, filterable list of schedules using the
standard pagination envelope `{count, next, previous, results}`, with a default
page size of 50 overridable via a bounded `page_size` query parameter. Existing
date-range and status filters SHALL continue to apply, scoping the paginated
result set.

The `Schedule` model SHALL carry database indexes supporting its hot query
paths: a composite index on `(start_date, end_date)` (serving both the calendar
date-range query and the conflict-detection overlap query) and a composite
index on `(pet, start_date)` (serving per-pet timelines).

#### Scenario: Listing schedules returns a paginated envelope

- GIVEN several schedules exist
- WHEN an authenticated user requests `GET /api/schedules/`
- THEN the response SHALL contain `count`, `next`, `previous`, and `results`

#### Scenario: Date-range filtering still applies under pagination

- GIVEN schedules spanning multiple months
- WHEN the user requests `GET /api/schedules/?start_date=…&end_date=…`
- THEN only schedules overlapping the range SHALL appear across the paginated
  results

#### Scenario: Range queries are index-backed

- GIVEN the schedules table
- WHEN a date-range or overlap query executes
- THEN it SHALL be able to use the `(start_date, end_date)` index rather than a
  full table scan
