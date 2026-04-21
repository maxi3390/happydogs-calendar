# Tasks

## 1. Component
- [x] 1.1 Refactor `frontend/src/components/PetList.tsx`:
  - Add a `PetFilters` interface and state object defaulted to `'all'` / `''`.
  - Render a filter toolbar at the top of the list card (search input + 5 dropdowns + clear-all link).
  - Derive the filtered list with `useMemo`.
  - Update the list header to read "Showing X of Y" when filters are active; keep the old "Registered Pets (N)" otherwise.
  - Add an inline empty-state when `pets.length > 0 && filteredPets.length === 0`.
- [x] 1.2 Build the Species dropdown options dynamically: canonical five plus any unique species values present on the loaded pets.

## 2. Translations
- [x] 2.1 Add `pet.filters.*` keys to `backend/translations/en.json` + `es.json`:
  - `searchPlaceholder`, `species`, `temperament`, `size`, `sex`, `neutered`, `all`, `yes`, `no`, `clearAll`, `noMatches`, `showing`.
- [x] 2.2 Verify both JSON files parse.

## 3. Spec
- [x] 3.1 Write `openspec/changes/pet-list-filters/specs/frontend/pets/spec.md` (MODIFIED delta, adds a "Pet List Search And Filters" requirement).
- [x] 3.2 Append the same to the baseline `openspec/specs/frontend/pets/spec.md`.

## 4. Verification
- [x] 4.1 `tsc --noEmit` — zero errors.
- [x] 4.2 Manual in the browser: type a name fragment → only matching pets remain; pick a Species → narrows further; Clear filters → full list returns.
- [x] 4.3 Manual: toggle `custom_pet_species` on, record a pet with a custom species, verify the Species dropdown now offers that value.
