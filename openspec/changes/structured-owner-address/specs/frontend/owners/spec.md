# Delta for Frontend Owners

## MODIFIED Requirements

### Requirement: Owner Form Uses Structured Address Inputs

The Owner creation and edit form SHALL display five separate labelled inputs for address components: street, city, state, province, and country. The form SHALL NOT render a single free-form address textarea.

The labels SHALL use the existing translation system with keys `owner.street`, `owner.city`, `owner.state`, `owner.province`, and `owner.country`. All inputs SHALL be optional.

#### Scenario: Form shows five address inputs

- GIVEN the owner form is rendered
- WHEN the user looks at the address section
- THEN five separate text inputs SHALL be visible with labels for street, city, state, province, and country

#### Scenario: Address fields roundtrip on save

- GIVEN the user fills in all five address inputs
- WHEN the form is submitted
- THEN the saved owner SHALL contain each value in the corresponding field
- AND reopening the owner for editing SHALL prefill all five inputs with the saved values

#### Scenario: Empty address fields are allowed

- GIVEN the user leaves one or more address inputs empty
- WHEN the form is submitted
- THEN the submission SHALL succeed
- AND empty fields SHALL be stored as empty strings on the backend

### Requirement: Owner Detail Display Shows Structured Address

The owner list/detail view SHALL display the structured address by joining non-empty parts, rather than the legacy `address` text field.

#### Scenario: Display joins non-empty parts with commas

- GIVEN an owner with street "Av. Cabildo 1234", city "CABA", state "Belgrano", province "Buenos Aires", country "Argentina"
- WHEN the detail view renders the address
- THEN the address SHALL be displayed as a single line joining the five values with ", " separators

#### Scenario: Display skips empty parts

- GIVEN an owner with only street "Av. Cabildo 1234" and city "CABA" filled
- WHEN the detail view renders the address
- THEN the displayed string SHALL be "Av. Cabildo 1234, CABA"
- AND the rendering SHALL NOT include empty placeholders or trailing commas
