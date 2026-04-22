# MODIFIED: Backend / Schedules

## ADDED Requirements

### Requirement: Time ordering is a single-day rule only

`ScheduleCreateSerializer` and `BatchScheduleCreateSerializer` SHALL apply the `start_time <= end_time` constraint only when `start_date == end_date`. On multi-day schedules (`end_date > start_date`), `start_time` and `end_time` describe wall-clock times on two different days (drop-off time on `start_date`, pickup time on `end_date`) and SHALL NOT be subject to any ordering constraint.

The date ordering rule (`start_date <= end_date`) is unchanged.

#### Scenario: Multi-day schedule with cross-day times is accepted

- GIVEN a payload with `start_date = 2026-04-21`, `end_date = 2026-04-23`, `start_time = 18:00`, `end_time = 10:00`
- WHEN it's POSTed to `/api/schedules/`
- THEN the request SHALL succeed with HTTP 201
- AND the created schedule SHALL store the provided values verbatim

#### Scenario: Multi-day batch schedule with cross-day times is accepted

- GIVEN a payload to `/api/schedules/batch_create/` with the same date/time pattern as above
- WHEN it is submitted with one or more `pet_ids`
- THEN the request SHALL succeed with HTTP 201

#### Scenario: Single-day schedule with reversed times is rejected

- GIVEN a payload with `start_date == end_date`, `start_time = 17:00`, `end_time = 09:00`
- WHEN it is POSTed to the schedules endpoint (single or batch)
- THEN the request SHALL fail with HTTP 400 and a validation error whose message conveys the same-day context
- AND no schedule SHALL be created

#### Scenario: Date ordering still enforced

- GIVEN a payload with `start_date > end_date`
- WHEN it is POSTed to the schedules endpoint
- THEN the request SHALL fail with HTTP 400 (unchanged behavior)
