# MODIFIED: Frontend / Pets

## ADDED Requirements

### Requirement: Pet List Search And Filters

The pet list SHALL expose a toolbar that contains:

1. A free-text search input at the top of the toolbar card.
2. A collapsible accordion labelled "Filters" that contains:
   - Four multi-select filter groups for `species`, `temperament`, `size`, and `sex`, rendered as toggleable chips.
   - A single boolean checkbox "Show only neutered pets" that filters the list to pets with `neutered === true`.
3. A footer row with the "Registered Pets (N)" / "Showing X of Y" counter and, when applicable, a "Clear filters" link.

The search input SHALL sit on its own row above the accordion and SHALL NOT be part of the collapsible region. The footer row (counter + clear link) SHALL also sit outside the accordion.

Each multi-select group's selection state is a set of values:

- An **empty selection** means the filter is inactive; every value matches.
- A **non-empty selection** narrows the list to pets whose attribute matches any of the selected values (OR within a group).
- Multiple groups with active selections are combined with AND across groups.

The Neutered checkbox is a boolean filter:

- **Unchecked** — neutered status is not filtered.
- **Checked** — only pets with `neutered === true` SHALL be visible.

The Species filter SHALL include the canonical five values (dog, cat, bird, rabbit, other) plus any additional values present on the currently-loaded pets, so custom species (when the `custom_pet_species` flag is on) are still filterable.

The list SHALL update live as the operator types in the search input, toggles a chip, or flips the checkbox — regardless of whether the accordion is expanded or collapsed.

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

#### Scenario: Neutered checkbox is a boolean filter

- GIVEN pets with both neutered and non-neutered entries
- AND the "Show only neutered pets" checkbox is unchecked
- THEN pets of both states SHALL be visible

- WHEN the operator checks the "Show only neutered pets" checkbox
- THEN only pets with `neutered === true` SHALL be visible

- WHEN the operator unchecks the checkbox
- THEN the filter SHALL return to inactive and pets of both states SHALL be visible again

#### Scenario: Accordion starts collapsed

- GIVEN the operator navigates to `/pets` for the first time in a session
- THEN the Filters accordion SHALL be rendered in the collapsed state
- AND the chip rows and the Neutered checkbox SHALL NOT be visible

#### Scenario: Expanding the accordion reveals the filter groups

- GIVEN the Filters accordion is collapsed
- WHEN the operator clicks the accordion header (or the chevron)
- THEN the accordion SHALL expand to show every chip row and the Neutered checkbox
- AND the chevron SHALL rotate to indicate the expanded state

#### Scenario: Active-filter badge on the accordion header

- GIVEN two filter groups have at least one active chip and the Neutered checkbox is checked
- THEN the accordion header SHALL display a badge showing the number of active filters (in this example, 3: two chip groups plus the Neutered checkbox)

#### Scenario: Collapsing the accordion preserves filter state

- GIVEN the operator has activated `Cat` in the Species filter and expanded the accordion
- WHEN the operator collapses the accordion
- THEN the list SHALL still be filtered to cats
- AND the "Showing X of Y" counter SHALL remain visible in the footer row

#### Scenario: Search and clear-filters remain usable while collapsed

- GIVEN the accordion is collapsed and at least one filter is active
- THEN the search input SHALL remain visible and interactive above the accordion
- AND the "Clear filters" link SHALL remain visible in the footer row
- WHEN the operator clicks "Clear filters"
- THEN every chip SHALL be deactivated, the Neutered checkbox SHALL be unchecked, and the search input SHALL be emptied — without the accordion needing to be expanded first

#### Scenario: Header counter reflects filters

- GIVEN `N` pets loaded and zero active filters
- THEN the list header SHALL read "Registered Pets (N)"
- WHEN any filter is active (search, at least one chip, or the Neutered checkbox)
- THEN the header SHALL read "Showing X of N" where X is the filtered count

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
