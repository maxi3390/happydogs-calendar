# Design — pet-list-filters

## Filter state

Single object kept in component state:

```ts
interface PetFilters {
  searchTerm: string;     // case-insensitive substring, matches name / breed / owner full name
  species: string;         // 'all' | canonical species | custom species value
  temperament: string;     // 'all' | one of TEMPERAMENT_VALUES
  size: string;            // 'all' | 'small' | 'medium' | 'large'
  sex: string;             // 'all' | 'male' | 'female'
  neutered: 'all' | 'yes' | 'no';
}
```

Defaults are `{ searchTerm: '', species: 'all', temperament: 'all', size: 'all', sex: 'all', neutered: 'all' }` so the "All" value is uniform across fields and trivially comparable.

## Derived filtered list

```ts
const filteredPets = useMemo(() => {
  return pets.filter(pet => {
    if (filters.searchTerm) { /* substring match name / breed / owner */ }
    if (filters.species !== 'all' && pet.species !== filters.species) return false;
    if (filters.temperament !== 'all' && pet.temperament !== filters.temperament) return false;
    if (filters.size !== 'all' && pet.size !== filters.size) return false;
    if (filters.sex !== 'all' && pet.sex !== filters.sex) return false;
    if (filters.neutered !== 'all') {
      const want = filters.neutered === 'yes';
      if (pet.neutered !== want) return false;
    }
    return true;
  });
}, [pets, filters]);
```

O(n) per keystroke. For a nursery with hundreds of pets this is imperceptible on modern hardware.

## Species dropdown — dynamic options

To cooperate with the `custom_pet_species` feature flag (which lets an operator save a species value outside the canonical five), the Species dropdown builds its options from the canonical list plus any unique species values actually present in `pets`:

```ts
const speciesOptions = useMemo(() => {
  const canonical = ['dog', 'cat', 'bird', 'rabbit', 'other'];
  const extras = [...new Set(pets.map(p => p.species).filter(s => !canonical.includes(s)))];
  return [...canonical, ...extras];
}, [pets]);
```

That way "ferret" shows up as a filter option as soon as someone records a ferret, and disappears once the last ferret is deleted — no configuration required.

## "Clear filters" semantics

The link appears whenever `hasActiveFilters` is true:

```ts
const hasActiveFilters =
  filters.searchTerm.trim() !== '' ||
  filters.species !== 'all' ||
  filters.temperament !== 'all' ||
  filters.size !== 'all' ||
  filters.sex !== 'all' ||
  filters.neutered !== 'all';
```

Clicking it resets the filter object to defaults.

## Header counter

- Default (no filters): `Registered Pets (N)` — unchanged from today.
- With active filters: `Showing X of Y pets` — X is `filteredPets.length`, Y is `pets.length`. Matches the "Showing N of M" idiom used elsewhere on the web so the pattern is instantly recognisable.

## Empty state

Two distinct messages:

- `pets.length === 0` — "No pets registered yet" + "Add your first pet" CTA (existing behaviour, untouched).
- `pets.length > 0 && filteredPets.length === 0` — new empty state: a muted message "No pets match your filters" with a "Clear filters" button inline.

The second state renders inside the same list card so the filter toolbar stays interactive (the operator can loosen a constraint without losing context).

## Layout

The pets page is restructured to match the owners-page idiom so staff don't have to context-switch between list screens:

- `<main class="max-w-7xl mx-auto ...">` — same container as owners (previously `max-w-4xl`).
- Page header on top: `Title + description` on the left, primary **"Add Pet"** button on the right (clicking opens `PetForm` in create mode).
- Search + filter bar in its own card: `bg-card rounded-2xl p-4 shadow-sm border border-border/50`. The search input is `max-w-md` when filters are hidden on mobile; on `lg`+ it shares the row with the five filter dropdowns.
- List items are individual cards — each pet is a `rounded-2xl shadow-sm border border-border/50 hover:shadow-md` block — rather than rows inside a single bordered container. This matches the owners list exactly and makes the cards stand out as the primary unit.
- The "Clear filters" control lives inside the search card when filters are active.

On `lg` and wider, the toolbar is a single row:

```
[ search… ]   [Species ▾] [Temperament ▾] [Size ▾] [Sex ▾] [Neutered ▾] [Clear]
```

On `sm` / mobile it stacks, with filters in a 2-column grid.

## Add Pet flow

The existing `/pets/page.tsx` rendered `PetForm` only when `editingPet` was truthy:

```tsx
{showPetForm && editingPet && ( <PetForm .../> )}
```

— which silently swallowed the create flow. The new page changes the guard to `{showPetForm && ( ... )}` and lets `PetForm` receive `pet={editingPet}` (undefined in create mode, which the form already handles). Clicking "Add Pet" does `setEditingPet(undefined); setShowPetForm(true)`.

## Rejected alternatives

- **Multi-select dropdowns** — for six-value attributes, a multi-select adds open/close state and chip UI for marginal benefit. Single-select with an explicit "All" covers 95% of the real query patterns ("show me the aggressive dogs") in a fraction of the UI.
- **Move filtering to the API** — `api.pets.list()` doesn't accept query params today. Adding `?species=dog&temperament=aggressive&...` is fine when the data gets big, but premature for the current scale and forces coordinated backend/frontend work. Client-side is simpler and equally correct for < a few thousand pets.
- **Sort controls** — out of scope; see proposal.
- **Persist filters to the URL** — attractive for shareable links but adds routing coupling; the page already re-fetches on mount, so filters naturally reset to defaults on a fresh visit. Revisit if an operator asks for shareable filtered views.
- **Inline the list into `app/pets/page.tsx`** (matching the owners page, which renders its list inline) — would delete the `PetList` component. Keeping `PetList` as a separate component is a small structural difference from `/owners` that buys us reusability (e.g. an owner-detail view could embed a `PetList` filtered by owner). The visual layout still matches owners — the code shape is slightly different, which is fine.
