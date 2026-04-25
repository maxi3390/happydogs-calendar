# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: PetForm SHALL expose deworming-date inputs behind the `deworming_tracking` flag

The pet creation / edit form (`PetForm`) SHALL render two `<input type="date">` controls — one labelled "Last Internal Deworming" and one labelled "Last External Deworming" — when the `deworming_tracking` feature flag is enabled. Each input SHALL be paired with a hint line describing what the date refers to.

When the flag is disabled, the form SHALL NOT render the inputs and SHALL NOT submit the deworming fields. Persisted values from a prior enabled period SHALL remain in the database.

#### Scenario: Flag enabled — inputs are visible and editable

- GIVEN the `deworming_tracking` flag is enabled
- WHEN the operator opens the Pet form
- THEN the form SHALL render a "Last Internal Deworming" date input
- AND the form SHALL render a "Last External Deworming" date input
- AND both inputs SHALL accept any valid ISO date

#### Scenario: Flag enabled — clearing the input submits null

- GIVEN the form is open and "Last Internal Deworming" already has a value
- WHEN the operator clears the input
- THEN the form SHALL submit `last_internal_deworming_date: null`

#### Scenario: Flag disabled — inputs are not rendered

- GIVEN the `deworming_tracking` flag is disabled
- WHEN the operator opens the Pet form
- THEN the form SHALL NOT render either deworming input

### Requirement: Pet read views SHALL display deworming dates behind the `deworming_tracking` flag

`PetDetailsPopup` and the expanded accordion in `PetList` SHALL render the two deworming dates as a 2-column grid placed before the special-notes block. Each cell SHALL show the localised date using `formatIsoDate` (`dd/MM/yyyy`) when set, or an em-dash (`—`) when `null`.

When the flag is disabled, the grid SHALL NOT be rendered.

#### Scenario: Flag enabled — both dates set

- GIVEN a pet with `last_internal_deworming_date = "2026-01-15"` and `last_external_deworming_date = "2026-04-10"`
- AND the `deworming_tracking` flag is enabled
- WHEN the operator opens `PetDetailsPopup` (or expands the accordion)
- THEN the two dates SHALL be displayed as `15/01/2026` and `10/04/2026`

#### Scenario: Flag enabled — one date missing

- GIVEN a pet with `last_internal_deworming_date = null` and `last_external_deworming_date = "2026-04-10"`
- AND the `deworming_tracking` flag is enabled
- WHEN the operator opens `PetDetailsPopup`
- THEN the internal cell SHALL show `—`
- AND the external cell SHALL show the formatted date

#### Scenario: Flag disabled — grid hidden

- GIVEN the `deworming_tracking` flag is disabled
- WHEN the operator opens `PetDetailsPopup` or expands the accordion
- THEN the deworming-date grid SHALL NOT be rendered
