# Design — entity-cross-popups

## Component split

```
<PetDetailsPopup     petId={id}    onClose={...} onEdit={(pet) => ...} />
<OwnerDetailsPopup   ownerId={id}  onClose={...} onEdit={(owner) => ...} />
```

Both follow the same shape:

- On mount: `useEffect` fires `api.<entity>.get(id)`. While loading, the card shows a small spinner; on error, a red banner with a Close button.
- On success: the card renders entity fields in the same visual vocabulary the existing forms use (labelled rounded rectangles, badge chips for categorical values, muted labels).
- Bottom footer: a **Close** ghost button on the left, an **Edit** primary button on the right. Clicking Edit calls `onEdit(entity)` so the parent can close the popup and open the corresponding form.

Keeping fetch logic inside the popup (rather than the parent passing a preloaded entity in) means the preview is always fresh — e.g. if a sibling tab edited the owner, reopening the popup reflects that. The parent only knows the id.

## Parent state machine

### `/pets`

```
                             ┌─ popup flow ─────────────────────────┐
                             │                                      │
  [PetList] --onViewOwner--> │  ownerDetailsId  (OwnerDetailsPopup) │
                             │           |                          │
                             │         Edit                         │
                             │           v                          │
                             │  editingOwner    (OwnerForm)         │
                             │                                      │
                             └──────────────────────────────────────┘
```

Two new state slots on the pets page:

```ts
const [ownerDetailsId, setOwnerDetailsId] = useState<number | null>(null);
const [editingOwner, setEditingOwner] = useState<Owner | undefined>();
```

`OwnerDetailsPopup` is rendered iff `ownerDetailsId !== null`. Its `onEdit(owner)` callback does:

```ts
setOwnerDetailsId(null);
setEditingOwner(owner);
```

`OwnerForm` is rendered iff `editingOwner !== undefined`.

### `/owners`

Existing state already includes `editingOwner` (for the Edit Owner button in the header action bar) and `petFormOwnerId` (for Add Pet). Add:

```ts
const [petDetailsId, setPetDetailsId] = useState<number | null>(null);
const [editingPet, setEditingPet] = useState<Pet | undefined>();
```

Extend the existing `PetForm` render so both Add (`petFormOwnerId`) and Edit (`editingPet`) route through the same component. The `PetForm` prop API already supports `pet={...}` for edit mode, so this is one extra prop on the existing call site.

The click on a pet card in the owner accordion does:

```ts
setPetDetailsId(pet.id);
```

`PetDetailsPopup`'s `onEdit(pet)` callback closes itself and opens `PetForm` in edit mode:

```ts
setPetDetailsId(null);
setEditingPet(pet);
setPetFormOwnerId(null); // clear the add-pet branch so we don't double-mount
```

## Popup payloads

### `OwnerDetailsPopup`

| Section                  | Fields surfaced                                                             |
|--------------------------|-----------------------------------------------------------------------------|
| Header                   | avatar, `full_name`, `email`, `phone`                                       |
| Identification           | `id_number`, `birth_date`                                                   |
| Address                  | `street`, `city`, `state`, `province`, `country` (omit empty ones)          |
| Emergency contact        | `emergency_contact`, `emergency_phone`, `emergency_contact_can_pickup`      |
| Veterinary (flag-gated)  | `primary_vet.name`, `emergency_vet.name` (only when `vet_management` on)    |
| Pets                     | badge with `pet_count` / `pets.length`                                      |
| Notes                    | `notes` (pre-wrap, preserves newlines)                                      |

### `PetDetailsPopup`

| Section                 | Fields surfaced                                                              |
|-------------------------|------------------------------------------------------------------------------|
| Header                  | avatar, `name`, `breed / species • age years`                                |
| Traits                  | `temperament`, `dominance_level` badge, `size`                               |
| Profile                 | `sex`, `neutered`, `weight` (formatted `NN.NN kg` when non-null)             |
| Owner                   | `owner_details.full_name` (or "No owner")                                    |
| Vet (flag-gated)        | `vet_override.name` (only when `vet_management` on, only if set)             |
| Special notes           | `special_notes` (pre-wrap)                                                   |

Image file-uploads stay out of the popup (the detail card does not let the operator replace profile pictures; that's an Edit-mode action). Medical notes and vaccinations are not rendered in the popup — they're also Edit-mode details.

## Accessibility

- Each popup is a `<div role="dialog" aria-modal="true" aria-labelledby>` (heading id).
- Close button is the primary focus target on mount (so Tab / Shift+Tab don't wander into the backdrop).
- Backdrop click closes the popup. Escape key closes it (we add a `keydown` listener on mount).
- The Edit button closes the popup before opening the form so only one modal is mounted at a time (avoids nested dialogs and focus-trap ambiguity).

## Translation surface

- `owner.detailsPopup.title` — "Owner Details"
- `owner.detailsPopup.editOwner` — "Edit Owner"
- `owner.detailsPopup.loading` — "Loading owner…"
- `owner.detailsPopup.loadFailed` — "Failed to load the owner"
- `pet.detailsPopup.title` — "Pet Details"
- `pet.detailsPopup.editPet` — "Edit Pet"
- `pet.detailsPopup.loading` — "Loading pet…"
- `pet.detailsPopup.loadFailed` — "Failed to load the pet"
- `common.close` — reused if present; added otherwise.

## Rejected alternatives

- **Inline editing inside the popup**. Tempting but would duplicate every validator and the vaccination / document / medical-notes sub-widgets. Keeping the popup read-only and deferring to the existing form keeps a single source of truth.
- **Navigate to a dedicated detail page (e.g. `/owners/123`) instead of a popup**. We don't have per-entity pages today, and the hand-off from edit would still need to come back to the list. The popup keeps the operator's list context (filters, search, scroll position) intact.
- **Fetch data from props instead of re-fetching on open**. The parent already has some entity data, but for pet rows in the owner accordion, the embedded `pets: [{ id, name, species, temperament, dominance_level, size, owner }]` is the light `PetListItem`-shaped projection — it does not include breed, age, weight, neutered, sex, special notes, or vaccinations. Rather than split the popup into "some fields from props, others from a lazy fetch" we just `api.pets.get(id)` and show everything consistently.
- **Add ESC listener at the provider level**. The popup self-contains the listener so it unmounts cleanly with the component — no coordination with global hotkeys needed.
- **Wrap the popup around `PetForm` / `OwnerForm` in a "read-only" mode**. Forms are already complicated; adding a read-only variant would fork every render branch. A small dedicated presentational component is ~100 lines and has a crisp contract.
