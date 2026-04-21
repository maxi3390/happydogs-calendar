# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet List Search And Filters

The pet list SHALL expose a toolbar with (1) a free-text search input and (2) one dropdown per canonical attribute (species, temperament, size, sex, neutered). Every dropdown SHALL default to "All". The list SHALL update live as the operator types or changes a dropdown.

The Species dropdown SHALL include the canonical five values (dog, cat, bird, rabbit, other) plus any additional values present on the currently-loaded pets, so custom species (when the `custom_pet_species` flag is on) are still filterable.

#### Scenario: Searching by name

- GIVEN pets named "Luna", "Rocco", "Bugs"
- WHEN the operator types `lun` in the search input
- THEN only "Luna" SHALL be visible in the list

#### Scenario: Searching by owner full name

- GIVEN a pet "Rocco" whose owner is "Luis Fernández"
- WHEN the operator types `fern` in the search input
- THEN Rocco SHALL be visible

#### Scenario: Filtering by species

- GIVEN a mixed list of pets
- WHEN the operator selects `Cat` from the Species dropdown
- THEN only pets with `species === 'cat'` SHALL be visible

#### Scenario: Combining search and filters

- GIVEN a mixed list of pets
- WHEN the operator types `mia` and selects `Cat` from Species
- THEN only cats whose name / breed / owner contains `mia` SHALL be visible

#### Scenario: Neutered tri-state

- GIVEN pets with both neutered and non-neutered entries
- WHEN the operator selects `Yes` from the Neutered dropdown
- THEN only pets with `neutered === true` SHALL be visible
- WHEN the operator selects `No`
- THEN only pets with `neutered === false` SHALL be visible

#### Scenario: Header counter reflects filters

- GIVEN `N` pets loaded and zero active filters
- THEN the list header SHALL read "Registered Pets (N)"
- WHEN any filter is active
- THEN the header SHALL read "Showing X of N" where X is the filtered count

#### Scenario: Clear filters link

- GIVEN at least one filter is active (including a non-empty search)
- THEN a "Clear filters" link SHALL be visible in the toolbar
- WHEN the operator clicks it
- THEN every dropdown SHALL return to "All"
- AND the search input SHALL be emptied
- AND the full list SHALL be visible again

#### Scenario: Empty state when filters match nothing

- GIVEN at least one pet exists
- AND the combined filters match zero pets
- THEN the list SHALL render an empty-state message distinct from the "No pets registered yet" state
- AND the empty state SHALL include a button / link that clears every filter

#### Scenario: Custom species is filterable

- GIVEN the `custom_pet_species` feature flag is on
- AND a pet exists whose `species` is a non-canonical value (e.g. `"ferret"`)
- WHEN the operator opens the Species dropdown
- THEN `"ferret"` SHALL appear as an option alongside the canonical five
