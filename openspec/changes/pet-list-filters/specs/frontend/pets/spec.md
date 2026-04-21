# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet List Search And Filters

The pet list SHALL expose a toolbar that contains (1) a free-text search input at the top and (2) one multi-select filter group per canonical attribute (species, temperament, size, sex, neutered) rendered as toggleable chips below the search. The list SHALL update live as the operator types or toggles a chip.

Each filter group's selection state is a set of values:

- An **empty selection** means the filter is inactive; every value matches.
- A **non-empty selection** narrows the list to pets whose attribute matches any of the selected values (OR within a group).
- Multiple groups with active selections are combined with AND across groups.

The Species filter SHALL include the canonical five values (dog, cat, bird, rabbit, other) plus any additional values present on the currently-loaded pets, so custom species (when the `custom_pet_species` flag is on) are still filterable.

The search input SHALL sit on its own row above the filter groups.

#### Scenario: Searching by name

- GIVEN pets named "Luna", "Rocco", "Bugs"
- WHEN the operator types `lun` in the search input
- THEN only "Luna" SHALL be visible in the list

#### Scenario: Searching by owner full name

- GIVEN a pet "Rocco" whose owner is "Luis Fernández"
- WHEN the operator types `fern` in the search input
- THEN Rocco SHALL be visible

#### Scenario: Single selection in a group (Species = Cat)

- GIVEN a mixed list of pets
- WHEN the operator activates the `Cat` chip in the Species filter
- THEN only pets with `species === 'cat'` SHALL be visible

#### Scenario: Multiple selections in the same group (OR)

- GIVEN a mixed list of pets
- WHEN the operator activates both `Cat` and `Dog` chips in the Species filter
- THEN pets with `species === 'cat'` OR `species === 'dog'` SHALL be visible
- AND pets of any other species SHALL be hidden

#### Scenario: Selections across different groups (AND)

- GIVEN a mixed list of pets
- WHEN the operator activates the `Dog` chip in Species AND the `Aggressive` chip in Temperament
- THEN only pets with `species === 'dog'` AND `temperament === 'aggressive'` SHALL be visible

#### Scenario: Deselecting every chip in a group makes the group inactive

- GIVEN the operator has activated `Cat` in the Species filter
- WHEN they deactivate the `Cat` chip
- THEN the Species filter SHALL be inactive
- AND pets of any species SHALL be visible again (subject to other active filters)

#### Scenario: Combining search and filters

- GIVEN a mixed list of pets
- WHEN the operator types `mia` and activates the `Cat` chip in Species
- THEN only cats whose name / breed / owner contains `mia` SHALL be visible

#### Scenario: Neutered multi-select

- GIVEN pets with both neutered and non-neutered entries
- WHEN the operator activates only the `Yes` chip in the Neutered filter
- THEN only pets with `neutered === true` SHALL be visible
- WHEN the operator also activates `No`
- THEN pets of both states SHALL be visible (the filter is effectively inactive)

#### Scenario: Header counter reflects filters

- GIVEN `N` pets loaded and zero active filters
- THEN the list header SHALL read "Registered Pets (N)"
- WHEN any filter is active (search or at least one chip)
- THEN the header SHALL read "Showing X of N" where X is the filtered count

#### Scenario: Clear filters link

- GIVEN at least one filter is active (including a non-empty search)
- THEN a "Clear filters" link SHALL be visible in the toolbar
- WHEN the operator clicks it
- THEN every chip SHALL be deactivated
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
- WHEN the operator views the Species chips
- THEN a `"ferret"` chip SHALL appear alongside the canonical five

### Requirement: Pet Page Header With "Add Pet" Button

The `/pets` page SHALL render a header section above the list containing (1) the page title plus a short description on the left and (2) a primary **"Add Pet"** button on the right. Clicking the button SHALL open the `PetForm` modal in create mode (no `pet` prop set).

#### Scenario: Add Pet button opens the form in create mode

- GIVEN the operator is on `/pets` and no form is visible
- WHEN the operator clicks "Add Pet"
- THEN the `PetForm` modal SHALL open
- AND the form SHALL NOT pre-fill any fields with existing pet data

#### Scenario: Edit button opens the form in edit mode

- GIVEN the operator is on `/pets` with at least one pet in the list
- WHEN the operator clicks the edit icon on a pet card
- THEN the `PetForm` modal SHALL open with that pet's data pre-filled

### Requirement: Pets Page Layout Parity With `/owners`

The `/pets` page SHALL mirror the visual shape of the `/owners` page:

- A `max-w-7xl` container.
- The header section (title + description + primary button) has the same alignment and spacing as the owners header.
- The search and filter toolbar lives in a dedicated `rounded-2xl` card below the header.
- Each pet is rendered as its own `rounded-2xl shadow-sm border border-border/50 hover:shadow-md` card with `space-y-4` between cards, rather than rows inside a single bordered list.

This is a structural requirement, not a pixel-exact one; sibling cards / toolbars may legitimately differ in their filter dropdowns and accordion contents.

#### Scenario: Pet list and owner list are visually consistent

- GIVEN an authenticated user
- WHEN they navigate from `/owners` to `/pets`
- THEN the two pages SHALL share the same header layout, the same search-card styling, and the same per-row card treatment
- AND the pets page SHALL NOT render its list as a single bordered container with divider lines between rows
