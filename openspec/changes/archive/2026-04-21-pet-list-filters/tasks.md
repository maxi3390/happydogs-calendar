# Tasks

## 1. Page layout parity
- [x] 1.1 `app/pets/page.tsx`:
  - Widen the container to `max-w-7xl` to match `/owners`.
  - Add a header with title + description on the left and a primary "Add Pet" button on the right.
  - Render `PetForm` whenever `showPetForm` is true (for both add and edit); fix the existing guard that never let the create flow open.
  - Clicking the header button clears `editingPet` and opens the form.
- [x] 1.2 List item restyle inside `PetList`:
  - Each pet becomes a standalone card (`bg-card rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-all`), stacked with `space-y-4`, matching the owners list.
  - Drop the outer `bg-card rounded-xl shadow-lg` wrapper and the `divide-y` container.
  - Move the filter toolbar into its own `rounded-2xl` card that sits between the page header and the list.

## 2. Search and filter toolbar
- [x] 2.1 `PetList.tsx` keeps ownership of the `PetFilters` state and the filtered list derivation.
- [x] 2.2 Toolbar renders inside its own card at the top of the list area.
- [x] 2.3 Build the Species dropdown options dynamically: canonical five plus any unique species values present on the loaded pets.

## 3. Multi-select via chips
- [x] 3.1 Change every filter group's state from a single string to `T[]`; empty array = filter inactive.
- [x] 3.2 Replace the `<select>` dropdowns with a `ChipFilterRow` component — one row per group, chips are `<button type="button">` with `aria-pressed` and OR-within-group / AND-across-group semantics.
- [x] 3.3 Update `filteredPets`, `hasActiveFilters`, and `clearFilters` to the new array-based shape.
- [x] 3.4 Move the search input to its own row above every filter group; filter groups stack beneath it.

## 4. Translations
- [x] 4.1 Add `pet.filters.*` keys to `backend/translations/en.json` + `es.json`:
  - `searchPlaceholder`, `species`, `temperament`, `size`, `sex`, `neutered`, `all`, `clearAll`, `noMatches`, `showing`.
- [x] 4.2 Verify both JSON files parse.

## 5. Spec
- [x] 5.1 Write the MODIFIED delta at `openspec/changes/pet-list-filters/specs/frontend/pets/spec.md`.
- [x] 5.2 Append the same requirements to the baseline `openspec/specs/frontend/pets/spec.md`.
- [x] 5.3 Update the spec to describe the multi-select chips + OR-within-group / AND-across-group semantics + search-above-filters layout.

## 6. Verification
- [x] 6.1 `tsc --noEmit` — zero errors.
- [x] 6.2 Manual: open `/pets`, click "Add Pet" → `PetForm` opens in create mode. Type a name fragment → list narrows. Activate `Cat` → further narrows. Activate `Dog` as well → shows cats OR dogs. Clear filters → full list.
- [x] 6.3 Manual: toggle `custom_pet_species` on, record a pet with a custom species (e.g. `ferret`), verify a `ferret` chip appears in the Species row.
- [x] 6.4 Visual diff vs `/owners`: page header, search card, list card styling all match.
