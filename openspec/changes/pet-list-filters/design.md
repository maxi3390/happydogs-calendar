# Design — pet-list-filters

## Filter state

Single object kept in component state:

```ts
interface PetFilters {
  searchTerm: string;        // case-insensitive substring, matches name / breed / owner full name
  species: string[];         // empty = filter inactive; otherwise pet matches iff species ∈ selection
  temperament: string[];     // same
  size: string[];            // same
  sex: string[];             // same
  neutered: ('yes' | 'no')[]; // same
}
```

Defaults are `{ searchTerm: '', species: [], temperament: [], size: [], sex: [], neutered: [] }`. Every filter is an array so the "inactive" state is uniformly `length === 0` — trivially detectable and trivially clearable.

## Selection semantics

- **Empty selection in a group** → the filter is inactive; every value matches.
- **One or more selections in a group** → the pet's attribute must equal one of the selected values (OR within a group).
- **Multiple groups with selections** → a pet must satisfy every group's constraint (AND across groups).

Concretely, a pet passes if for every group either the selection is empty or the pet's value is in the selection. A search term layered on top adds one more AND clause.

## Derived filtered list

```ts
const filteredPets = useMemo(() => {
  const search = filters.searchTerm.trim().toLowerCase();
  return pets.filter(pet => {
    if (search) { /* substring match name / breed / owner */ }
    if (filters.species.length && !filters.species.includes(pet.species)) return false;
    if (filters.temperament.length && !filters.temperament.includes(pet.temperament)) return false;
    if (filters.size.length && !filters.size.includes(pet.size)) return false;
    if (filters.sex.length && !filters.sex.includes(pet.sex)) return false;
    if (filters.neutered.length) {
      const state: 'yes' | 'no' = pet.neutered ? 'yes' : 'no';
      if (!filters.neutered.includes(state)) return false;
    }
    return true;
  });
}, [pets, filters]);
```

O(n) per keystroke or chip toggle. Trivial at the expected scale.

## UI — chip-style multi-select

Rendering native `<select multiple>` would work but looks clunky and breaks the visual language the rest of the app uses. Instead, each filter group is a label followed by a row of toggleable chips:

```
Species:     [Dog✓] [Cat] [Bird] [Rabbit] [Other]
Temperament: [Calm] [Playful✓] [Aggressive] [Anxious] [Friendly]
Size:        [Small] [Medium] [Large]
Sex:         [Male] [Female]
Neutered:    [Yes] [No]
```

A selected chip gets `bg-primary text-white border-primary`; an unselected chip is `bg-transparent text-foreground/70 border-border hover:bg-secondary/50`. Clicking toggles membership in the group's array.

Chips are `<button type="button">` so keyboard operation (Space / Enter to toggle) is free. The whole group has an `aria-label` derived from the group name.

## Species dropdown — dynamic options

Same rule as before: canonical five plus any unique species values actually present in `pets`, so `custom_pet_species` entries (ferret, iguana, …) are filterable.

## "Clear filters" semantics

Visible whenever `hasActiveFilters` is true:

```ts
const hasActiveFilters =
  filters.searchTerm.trim() !== '' ||
  filters.species.length > 0 ||
  filters.temperament.length > 0 ||
  filters.size.length > 0 ||
  filters.sex.length > 0 ||
  filters.neutered.length > 0;
```

Clicking it resets the filter object to defaults (all arrays empty, search empty).

## Header counter

- Default (no filters): `Registered Pets (N)`.
- With active filters: `Showing X of Y pets`.

## Empty state

Two distinct messages:

- `pets.length === 0` — "No pets registered yet" + "Add your first pet" CTA (existing behaviour).
- `pets.length > 0 && filteredPets.length === 0` — "No pets match your filters" with an inline "Clear filters" button.

## Layout

The toolbar card is divided into two stacked regions:

```
┌─ Toolbar card (rounded-2xl) ─────────────────────────────────────┐
│ [ 🔍 search input — full width, its own row ]                    │
│                                                                  │
│ Species:      [Dog] [Cat] [Bird] [Rabbit] [Other]                │
│ Temperament:  [Calm] [Playful] [Aggressive] [Anxious] [Friendly] │
│ Size:         [Small] [Medium] [Large]                           │
│ Sex:          [Male] [Female]                                    │
│ Neutered:     [Yes] [No]                                         │
│                                                                  │
│ Showing 3 of 12 pets                           [× Clear filters] │
└──────────────────────────────────────────────────────────────────┘
```

The search input always sits on top; each filter group is on its own row below it; the counter + clear link live at the bottom. On narrow screens every chip row wraps naturally via `flex flex-wrap`.

## Add Pet flow

The existing `/pets/page.tsx` rendered `PetForm` only when `editingPet` was truthy:

```tsx
{showPetForm && editingPet && ( <PetForm .../> )}
```

— which silently swallowed the create flow. The new page changes the guard to `{showPetForm && ( ... )}` and lets `PetForm` receive `pet={editingPet}` (undefined in create mode, which the form already handles). Clicking "Add Pet" does `setEditingPet(undefined); setShowPetForm(true)`.

## Rejected alternatives

- **Native `<select multiple size="N">`** — works with assistive tech out of the box but looks inconsistent with the rest of the UI and makes toggle interactions (Ctrl+Click) non-obvious. Chips are more discoverable.
- **Checkbox-in-dropdown pattern** — hides selection state behind a click; we'd want the selection state visible at a glance on a filter bar. Chips keep the state and the affordance in the same place.
- **Move filtering to the API** — `api.pets.list()` doesn't accept query params today. Adding `?species=dog&temperament=aggressive&...` is fine when the data gets big, but premature for the current scale. Client-side is simpler and equally correct for < a few thousand pets.
- **Sort controls** — out of scope; see proposal.
- **Persist filters to the URL** — attractive for shareable links but adds routing coupling; the page already re-fetches on mount, so filters naturally reset to defaults on a fresh visit.
- **Inline the list into `app/pets/page.tsx`** (matching the owners page, which renders its list inline) — would delete the `PetList` component. Keeping `PetList` as a separate component is a small structural difference from `/owners` that buys us reusability (e.g. an owner-detail view could embed a `PetList` filtered by owner). The visual layout still matches owners — the code shape is slightly different, which is fine.
