# Delta for Backend Owners

## MODIFIED Requirements

### Requirement: Owner Address Is Structured

The Owner model SHALL store its address as five structured fields, not a single free-form text field:

- `street` — street address line
- `city` — ciudad
- `state` — localidad
- `province` — provincia
- `country` — país

The previous free-form `address` TextField SHALL be removed. A data migration SHALL copy any existing `address` value into the new `street` field, truncated to 255 characters if necessary.

Every field SHALL be optional.

#### Scenario: Creating an owner with a full structured address

- GIVEN an authenticated user submits owner creation data with all five address fields filled
- WHEN the owner is created
- THEN the response SHALL include the same five address fields
- AND the persisted owner SHALL store each field on its own column

#### Scenario: Creating an owner with no address fields

- GIVEN an authenticated user submits owner creation data with none of the address fields
- WHEN the owner is created
- THEN the creation SHALL succeed
- AND each address field SHALL default to an empty string in the response

#### Scenario: Patching a single address field

- GIVEN an existing owner with an address already set
- WHEN the user submits a PATCH with only `{ "state": "Belgrano" }`
- THEN only the `state` field SHALL change
- AND all other fields (including other address fields) SHALL remain unchanged

#### Scenario: Owner detail payload includes structured address fields

- GIVEN an owner exists with street, city, state, province, and country set
- WHEN the detail endpoint (`GET /api/owners/{id}/`) is queried
- THEN the response SHALL include all five fields
- AND the response SHALL NOT include the legacy `address` field

## REMOVED Requirements

### Requirement: Owner Has Free-form Address TextField

This requirement is removed. The Owner model no longer has a free-form `address` text field; addresses are now structured (see the new requirement above).
