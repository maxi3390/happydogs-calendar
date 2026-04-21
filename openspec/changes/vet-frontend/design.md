# Design — vet-frontend

## Module layout

New folder `frontend/src/domain/vets/`:

```
types.ts   Vet, VetFormData, VetListItem types
api.ts     vetsApi: list / get / create / update / delete
index.ts   barrel re-export
```

`lib/api.ts` gets a one-line registration under the `api` object. Types are re-exported from `lib/api.ts` so existing `import { …, Vet } from '@/lib/api'` patterns work.

## Type updates

- `Owner` gains two optional nullable FK ids: `primary_vet: number | null` and `emergency_vet: number | null`. Matches the DRF serializer shape (`fields='__all__'` on `OwnerSerializer`).
- `Pet` gains `vet_override: number | null`.
- `OwnerFormData` and `PetFormData` mirror the FK fields as optional to keep backward compatibility with existing call sites that don't set them.

## Components

### `VetForm.tsx`

Modal layout borrowed from `OwnerForm.tsx`:

- Top: title + close button.
- Fields grouped into two sections:
  - Contact — `name` (required), `phone`, `email`.
  - Address — `street`, `city`, `state`, `province`, `country` (matches the backend Address mixin field names).
- Bottom: `notes` textarea; Cancel / Save buttons.
- Uses the shared `Input` component and the existing card styling.

### `VetList.tsx`

Mirrors `OwnerList` semantics at a smaller footprint:

- Search box filters by `name`, `email`, and `city`.
- Card per vet: name (bold), address one-line summary, contact chips.
- Per-card "Edit" and "Delete" buttons.
- Empty state with a "Add your first vet" CTA.

### `/vets` page

Thin wrapper: renders `Navigation`, page header, "Add Vet" button, `VetList`, and conditionally the `VetForm` modal. Guards with `withAuth` like every other authenticated page.

## Form integration

### `OwnerForm.tsx`

Two new optional `<select>` elements inside a new "Veterinary" section below the emergency contact section. Populated from `api.vets.list()` fetched on mount. Empty value = null. Both dropdowns share the same data source; selecting a vet in one does not disable it in the other (the operator can intentionally use the same clinic for both primary and emergency).

### `PetForm.tsx`

One new optional `<select>` for `vet_override`. Hint text explains the resolver order and that leaving it empty defers to the owner's primary vet. Placed after the "Special notes" field so operators can set it only when needed.

## Translation surface

Structure under a new top-level `vet.*` namespace:

- `vet.title`, `vet.description`, `vet.addVet`, `vet.editVet`, `vet.noVets`, `vet.addFirst`, `vet.registeredVets`.
- `vet.name`, `vet.phone`, `vet.email`, `vet.address*` (reuses the Address field labels the owner form already translates).
- `vet.notes`, `vet.notesPlaceholder`.
- `owner.primaryVet`, `owner.emergencyVet`, `owner.veterinarySection`.
- `pet.vetOverride`, `pet.vetOverrideHint`, `pet.noVetOverride`.
- `nav.vets`, `confirmations.deleteVet`, `errors.vetLoadFailed`.

Both `backend/translations/en.json` and `backend/translations/es.json` gain the same keys in the same commit. JSON validity is checked post-edit.

## Rejected alternatives

- **Backend `/api/vets/dropdown/` endpoint** — a lean dropdown endpoint is worth it only when the full list grows past a few hundred rows. We already call `api.owners.dropdown()` because owners can scale much higher. Vets are typically < 50 per nursery; adding a dropdown endpoint would be a premature optimisation. Revisit if a heavy user surfaces it.
- **Dedicated `VetSelect` component** — would add indirection for three call sites (two in `OwnerForm`, one in `PetForm`). Inline native `<select>` matches the pattern already used by `PetForm`'s owner dropdown.
- **Auto-derived `effective_vet` display on the pet detail view** — out of scope here because the frontend currently has no pet detail page; the owner-detail card already shows a pet summary but doesn't include care info. Revisit when that detail view lands.
- **Nested vet editor inside `OwnerForm` / `PetForm`** — rejected in favour of the dedicated `/vets` page. Inline creation would complicate form state and violates the single-responsibility principle of the current forms.
