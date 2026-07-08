# MODIFIED: Backend / Pets

## MODIFIED Requirements

### Requirement: Pet Listing

The system SHALL provide a paginated list of pets. The list response SHALL use
the standard pagination envelope `{count, next, previous, results}`, where
`results` holds the page of serialized pets. The default page size SHALL be 50,
overridable per request via a `page_size` query parameter up to a bounded
maximum.

Listing SHALL be efficient: the number of database queries SHALL NOT grow with
the number of pets returned. In particular, `medical_notes_count` SHALL be
provided via a query annotation (not a per-row `COUNT`), and owner / vet
relations serialized in the list SHALL be fetched with `select_related`.

#### Scenario: Listing pets returns a paginated envelope

- GIVEN several pets exist
- WHEN an authenticated user requests `GET /api/pets/`
- THEN the response SHALL contain `count`, `next`, `previous`, and `results`
- AND `results` SHALL contain at most the page size number of pets

#### Scenario: Listing pets issues a constant number of queries

- GIVEN N pets exist, each with medical notes and a vet
- WHEN the list endpoint is queried
- THEN the number of SQL queries SHALL be independent of N

#### Scenario: Page size can be overridden within bounds

- GIVEN more pets exist than the default page size
- WHEN the user requests `GET /api/pets/?page_size=10`
- THEN `results` SHALL contain at most 10 pets
- AND a `page_size` larger than the configured maximum SHALL be capped
