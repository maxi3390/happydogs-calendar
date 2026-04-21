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
  neuteredOnly: boolean;     // false = no filter; true = only pets with neutered === true
}
```

Defaults are `{ searchTerm: '', species: [], temperament: [], size: [], sex: [], neuteredOnly: false }`. The multi-select groups use arrays (empty = inactive). Neutered is a single boolean — the underlying field is already boolean on the model and only one direction of the filter ("neutered only") has real product value, so a checkbox is the matching control.

## Selection semantics

For the four chip-based multi-select groups:

- **Empty selection in a group** → the filter is inactive; every value matches.
- **One or more selections in a group** → the pet's attribute must equal one of the selected values (OR within a group).
- **Multiple groups with selections** → a pet must satisfy every group's constraint (AND across groups).

For the Neutered checkbox:

- **Unchecked** → the filter is inactive; pets of any neutered status are shown.
- **Checked** → the list is narrowed to pets with `neutered === true`.

A "show only non-neutered" state is deliberately out of scope. Most nurseries have a policy that requires neutered pets for certain services, so the "only neutered" filter is the high-value query; the inverse is low-volume enough that adding a tri-state control (checked / unchecked / indeterminate) would add more complexity than the query justifies.

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
    if (filters.neuteredOnly && !pet.neutered) return false;
    return true;
  });
}, [pets, filters]);
```

O(n) per keystroke, chip toggle, or checkbox flip. Trivial at the expected scale.

## UI — chip-style multi-select

Rendering native `<select multiple>` would work but looks clunky and breaks the visual language the rest of the app uses. Instead, each multi-select filter group is a label followed by a row of toggleable chips:

```
Species:     [Dog✓] [Cat] [Bird] [Rabbit] [Other]
Temperament: [Calm] [Playful✓] [Aggressive] [Anxious] [Friendly]
Size:        [Small] [Medium] [Large]
Sex:         [Male] [Female]
```

A selected chip gets `bg-primary text-white border-primary`; an unselected chip is `bg-transparent text-foreground/70 border-border hover:bg-secondary/50`. Clicking toggles membership in the group's array.

Chips are `<button type="button">` so keyboard operation (Space / Enter to toggle) is free. The whole group has an `aria-label` derived from the group name.

## UI — Neutered checkbox

The Neutered filter renders as a single `<input type="checkbox">` plus a label:

```
☑ Show only neutered pets
```

A native checkbox is accessible out of the box (Space toggles, keyboard focus, announced by screen readers as "checked" / "not checked"). Styling follows the app's existing form-checkbox conventions (primary color when checked, neutral border when unchecked).

## Species chip list — dynamic options

Same rule as before: canonical five plus any unique species values actually present in `pets`, so `custom_pet_species` entries (ferret, iguana, …) are filterable.

## Accordion wrapper

All five filter controls (four chip groups + Neutered checkbox) live inside a collapsible accordion. The accordion header reads "Filters"; a chevron on the right rotates to indicate state. When one or more filter groups are active, a small badge with the active-group count appears next to the header (e.g. "Filters · 2"). The accordion starts collapsed so the page's first impression is list + search rather than a wall of filters.

The search input and the "Showing X of Y" / "Clear filters" row stay **outside** the accordion, so:

- The operator can narrow by search without expanding the accordion.
- They always see the count and can clear every filter from the visible surface, even when the accordion is collapsed.

Interaction contract:

- Click anywhere on the header (or the chevron) to toggle.
- The accordion is a button (`<button type="button" aria-expanded aria-controls>`) for keyboard / screen-reader compatibility.
- Collapsing the accordion does NOT reset filter state. Filters keep applying whether the accordion is open or closed.

## "Clear filters" semantics

Visible whenever `hasActiveFilters` is true:

```ts
const hasActiveFilters =
  filters.searchTerm.trim() !== '' ||
  filters.species.length > 0 ||
  filters.temperament.length > 0 ||
  filters.size.length > 0 ||
  filters.sex.length > 0 ||
  filters.neuteredOnly;
```

Clicking it resets the filter object to defaults (all arrays empty, checkbox unchecked, search empty). The reset happens regardless of whether the accordion is currently expanded or collapsed.

## Header counter

- Default (no filters): `Registered Pets (N)`.
- With active filters: `Showing X of Y pets`.

## Empty state

Two distinct messages:

- `pets.length === 0` — "No pets registered yet" + "Add your first pet" CTA (existing behaviour).
- `pets.length > 0 && filteredPets.length === 0` — "No pets match your filters" with an inline "Clear filters" button.

## Layout

```
┌─ Toolbar card (rounded-2xl) ─────────────────────────────────────┐
│ [ 🔍 search input — full width, its own row ]                    │
│                                                                  │
│ ┌─ Filters · 2          ▾ ──────────────────────────────────┐  │
│ │  (expanded content:)                                        │  │
│ │  Species:     [Dog] [Cat] [Bird] [Rabbit] [Other]           │  │
│ │  Temperament: [Calm] [Playful] ...                          │  │
│ │  Size:        [Small] [Medium] [Large]                      │  │
│ │  Sex:         [Male] [Female]                               │  │
│ │  ☐ Show only neutered pets                                  │  │
│ └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Showing 3 of 12 pets                           [× Clear filters] │
└──────────────────────────────────────────────────────────────────┘
```

On narrow screens every chip row wraps naturally via `flex flex-wrap`. The accordion header stays a single row at any width.

## Add Pet flow

The existing `/pets/page.tsx` rendered `PetForm` only when `editingPet` was truthy:

```tsx
{showPetForm && editingPet && ( <PetForm .../> )}
```

— which silently swallowed the create flow. The new page changes the guard to `{showPetForm && ( ... )}` and lets `PetForm` receive `pet={editingPet}` (undefined in create mode, which the form already handles). Clicking "Add Pet" does `setEditingPet(undefined); setShowPetForm(true)`.

## Rejected alternatives

- **Keep Neutered as a multi-select** (chips for `yes` / `no`) — two states where selecting both is equivalent to selecting neither. The checkbox encodes the same information with one control and no redundant states.
- **Tri-state checkbox for Neutered** (unchecked / checked / indeterminate = "only non-neutered") — confusing state machine, non-standard assistive-tech story, low product value. Skip.
- **Native `<select multiple size="N">`** — works with assistive tech out of the box but looks inconsistent with the rest of the UI and makes toggle interactions (Ctrl+Click) non-obvious. Chips are more discoverable.
- **Use HTML `<details>` / `<summary>` for the accordion** — native and accessible, but the styling of `<summary>` is hard to fully control cross-browser (Safari insists on a disclosure triangle marker). A hand-rolled `<button aria-expanded>` gives us the same semantics with full styling control. Kept the native-button behavior (Space / Enter to toggle).
- **Move filtering to the API** — `api.pets.list()` doesn't accept query params today. Adding `?species=dog&temperament=aggressive&...` is fine when the data gets big, but premature for the current scale. Client-side is simpler and equally correct for < a few thousand pets.
- **Sort controls** — out of scope; see proposal.
- **Persist filters to the URL** — attractive for shareable links but adds routing coupling; the page already re-fetches on mount, so filters naturally reset to defaults on a fresh visit.
- **Auto-expand the accordion when a filter is active** — briefly considered, but the whole point is to keep vertical space clean; the badge on the header already signals active filters. The operator decides when to expand.
- **Inline the list into `app/pets/page.tsx`** (matching the owners page, which renders its list inline) — would delete the `PetList` component. Keeping `PetList` as a separate component is a small structural difference from `/owners` that buys us reusability (e.g. an owner-detail view could embed a `PetList` filtered by owner). The visual layout still matches owners — the code shape is slightly different, which is fine.
