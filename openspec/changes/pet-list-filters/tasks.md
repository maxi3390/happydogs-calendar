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

## 3. Translations
- [x] 3.1 Add `pet.filters.*` keys to `backend/translations/en.json` + `es.json`:
  - `searchPlaceholder`, `species`, `temperament`, `size`, `sex`, `neutered`, `all`, `clearAll`, `noMatches`, `showing`.
- [x] 3.2 Verify both JSON files parse.

## 4. Spec
- [x] 4.1 Write the MODIFIED delta at `openspec/changes/pet-list-filters/specs/frontend/pets/spec.md`.
- [x] 4.2 Append the same requirements to the baseline `openspec/specs/frontend/pets/spec.md`.

## 5. Verification
- [x] 5.1 `tsc --noEmit` — zero errors.
- [x] 5.2 Manual: open `/pets`, click "Add Pet" → `PetForm` opens in create mode. Type a name fragment → list narrows. Pick a Species → further narrows. Clear filters → full list returns.
- [x] 5.3 Manual: toggle `custom_pet_species` on, record a pet with a custom species (e.g. `ferret`), verify the Species dropdown now offers that value.
- [x] 5.4 Visual diff vs `/owners`: page header, search card, list card styling all match.
