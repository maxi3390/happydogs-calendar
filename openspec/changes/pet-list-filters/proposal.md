# Proposal — pet-list-filters

## Intent

Make the `/pets` list navigable when the nursery has more than a handful of pets. Today the page shows every pet in creation order with no search and no way to narrow by common attributes (species, temperament, size, sex, neutered). Operators end up scrolling — or worse, using Ctrl-F in the browser — to find a specific animal. Add a search box and a small set of filter dropdowns so that "all the aggressive large dogs" or "Luna" are both one interaction away.

## Scope

### In scope

- A search input at the top of the pets page that matches (case-insensitive, substring) against the pet's `name`, `breed`, and its owner's `full_name`. Debouncing is not needed — the list is already in memory after the initial `api.pets.list()` fetch. The search input SHALL sit **above** the filter area, on its own row inside the toolbar card.
- Five **multi-select** filter groups, rendered below the search as toggleable chips. An empty selection for a group means that filter is inactive; one or more selected chips narrow the list to pets matching **any** of the selected values (OR within a group, AND across groups).
  - **Species** — the canonical set (dog / cat / bird / rabbit / other) plus any additional values found on the currently-loaded pets. This keeps the filter honest even when `custom_pet_species` is on and an operator has recorded a value outside the canonical list.
  - **Temperament** — the five canonical values.
  - **Size** — small / medium / large.
  - **Sex** — male / female.
  - **Neutered** — `yes` / `no` (selecting neither is "all"; selecting both is functionally equivalent).
- A "Clear filters" link that appears when at least one filter is active (including the search box).
- The list header updates from `Registered Pets (N)` to `Showing X of Y` when a filter is active, so the operator always knows how many matches they're seeing.
- A dedicated empty-state when the combined search + filters match zero pets (distinct from the "no pets registered yet" state).
- **Layout parity with `/owners`**: the `/pets` page SHALL mirror the owners page — a header with a `Title + description` on the left and an **"Add Pet"** primary button on the right, a search card in its own `rounded-2xl` wrapper, a `max-w-7xl` container, and individual pet rows rendered as standalone `rounded-2xl` cards with `shadow-sm` / `hover:shadow-md` instead of the old single-card + divide-y list.
- **Add Pet flow**: clicking "Add Pet" opens the `PetForm` in create mode. (Previously the flow was unreachable because the page only rendered `PetForm` when `editingPet` was set — a latent bug fixed as part of this change.)

### Out of scope

- Server-side search. The existing `api.pets.list()` endpoint returns all pets in one request; filtering happens on the client. If the nursery grows past thousands of pets we can revisit and push some filters into the DRF ViewSet's `filter_backends`, but premature backend filtering adds payload shape churn for no current benefit.
- Sorting. The list is already ordered by the backend's default (`ordering = ['name']` via `Pet.Meta`). Adding a sort control alongside the filters would expand the UI and the spec without solving a stated problem.
- Age / weight / dominance range sliders. Interesting but low-evidence demand; sliders also complicate the "Clear filters" UX. Defer until requested.
- Filter persistence across navigation. The current page already re-fetches on mount; restoring filter state from the URL or localStorage is a separate, opinionated feature.
- Pet-list sharing (URL with encoded filters). Same reasoning — revisit if asked.

## Approach

1. Introduce a `PetFilters` object inside `PetList` with one field per filter plus `searchTerm`. Default every field to `'all'` / `''`.
2. Derive the filtered list with a `useMemo` that walks `pets` and short-circuits as soon as any condition fails. Every comparison is a string lowercase equality or substring match — O(n) per keystroke, trivial for the expected scale.
3. Render the toolbar inside the same card as the list, separated by the existing muted header band. Keep the desktop layout single-row on wide screens and stack on mobile (`grid-cols-2` at `sm`, `grid-cols-5` at `lg`).
4. Translations live under a new `pet.filters.*` namespace so the filter labels and "All" placeholders are translatable in both locales. The existing `pet.speciesOptions`, `pet.temperamentOptions`, etc. are already translated — reuse them.
5. Gate nothing behind a feature flag — filtering a list is a universal expectation, not an experimental surface. If an operator wants to hide it, they can always clear the filters.
