# MODIFIED: Backend / Owners

## MODIFIED Requirements

### Requirement: Owner Listing

The system SHALL provide a paginated list of owners using the standard
pagination envelope `{count, next, previous, results}`, with a default page
size of 50 overridable via a bounded `page_size` query parameter.

Listing SHALL be efficient: query count SHALL NOT grow with the number of
owners returned. `pet_count` SHALL be provided via a query annotation rather
than a per-row `COUNT`, and `primary_vet` / `emergency_vet` SHALL be fetched
with `select_related`.

#### Scenario: Listing owners returns a paginated envelope

- GIVEN several owners exist
- WHEN an authenticated user requests `GET /api/owners/`
- THEN the response SHALL contain `count`, `next`, `previous`, and `results`

#### Scenario: Listing owners issues a constant number of queries

- GIVEN N owners exist, each with pets and vet references
- WHEN the list endpoint is queried
- THEN the number of SQL queries SHALL be independent of N
