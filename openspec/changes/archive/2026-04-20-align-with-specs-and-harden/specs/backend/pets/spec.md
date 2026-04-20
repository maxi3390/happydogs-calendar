# Delta for Backend Pets

## MODIFIED Requirements

### Requirement: Pet Compatibility Check

The compatibility check endpoint SHALL return all triggered incompatibility rules for each incompatible pet, not just the first rule that fails.

#### Scenario: Single rule triggered

- GIVEN two pets where only one compatibility rule is triggered (e.g., both have dominance > 7)
- WHEN the compatibility endpoint is queried
- THEN the response SHALL include `is_compatible: false`, `reason` (string with the single rule), and `reasons` (list with one entry)

#### Scenario: Multiple rules triggered for the same pair

- GIVEN two pets where multiple rules are triggered (e.g., one is aggressive AND the size/dominance gap is large)
- WHEN the compatibility endpoint is queried
- THEN the response SHALL include `is_compatible: false`
- AND the `reasons` list SHALL contain an entry for every triggered rule
- AND the `reason` string SHALL contain the first triggered rule for backward compatibility

#### Scenario: Pets are compatible

- GIVEN two pets where no compatibility rule is triggered
- WHEN the compatibility endpoint is queried
- THEN the response SHALL include `is_compatible: true`
- AND the `reasons` list SHALL be empty
- AND the `reason` field SHALL be null or absent
