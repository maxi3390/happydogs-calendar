# Design — vet-details-popup

## Backend

### `VetListSerializer`

New DRF serializer in `backend/pets/serializers.py`:

```python
class VetListSerializer(serializers.ModelSerializer):
    """Compact projection of a Vet used as a nested read-only block
    on Pet and Owner serializers. Renders the vet's identifying info
    so the pet / owner details popups can show a real name and basic
    contact info without issuing a second request."""

    class Meta:
        model = Vet
        fields = ['id', 'name', 'phone', 'email', 'city']
```

Fields chosen:

- **`id`** — the popup uses it to open the `VetDetailsPopup` (which re-fetches the full record).
- **`name`** — the canonical label; what the popup will display instead of the current `#<id>`.
- **`phone`, `email`** — allow the operator to see contact info at a glance before opening the dedicated vet popup. Small additional payload (total ~20–120 bytes per vet) and matches the two chips already shown on the Vets list cards.
- **`city`** — the single most useful address fragment for disambiguation ("Dr. Smith" can be two different clinics in different cities). Also mirrors what `VetList` already surfaces.

### Enriched serializers

- `PetSerializer`: add `vet_override_details = VetListSerializer(source='vet_override', read_only=True)`. Leave the existing `vet_override` FK column as-is so the pet form still POSTs / PATCHes by id.
- `OwnerSerializer`: add `primary_vet_details` and `emergency_vet_details`, same `VetListSerializer` projection, sourced from `primary_vet` / `emergency_vet`. Keep the raw FK columns too.
- `OwnerWithPetsSerializer`: add the same two `*_details` fields so the `/api/owners/<id>/` response used by `OwnerDetailsPopup` carries both vet previews.

This mirrors the existing `owner_details` pattern on `PetSerializer` — one parent field backed by the FK id, one nested projection for reads.

### Why not reuse the full `VetSerializer`?

The full vet payload includes the entire `Address` mixin (`street`, `city`, `state`, `province`, `country`), `notes`, and `created_at` / `updated_at`. None of those are useful at the call-site (the popup re-fetches the full record on click). Keeping the nested block compact:

- Keeps the pet / owner list endpoints cheap (one of them is called on every page load for the list view).
- Avoids accidentally coupling callers to a field we might later want to hide (e.g. internal vet notes).

## Frontend

### `VetListItem` type

Exported from `frontend/src/domain/vets/types.ts`. The module already defines a `VetListItem` interface shaped almost identically to what the new nested serializer returns. We keep the existing interface and reuse it for both call-sites — avoids drift between "a vet as listed on the vets page" and "a vet referenced from a pet/owner payload".

### Type extensions

| Type | New field | Value |
|------|-----------|-------|
| `Pet` | `vet_override_details?: VetListItem \| null` | Populated whenever `vet_override` is set. |
| `Owner` | `primary_vet_details?: VetListItem \| null` | Populated whenever `primary_vet` is set. |
| `Owner` | `emergency_vet_details?: VetListItem \| null` | Populated whenever `emergency_vet` is set. |
| `OwnerWithPets` | same two as above. | Inherited via `extends Owner` (no change needed there — the base already carries them). |

All three are optional on the TS side because older cached payloads (on a stale browser tab after a backend upgrade) would not include them; the popups treat "`details` missing but `id` present" identically to "id null" and degrade silently.

### `VetDetailsPopup` component

Path: `frontend/src/components/VetDetailsPopup.tsx`.

Structure mirrors `OwnerDetailsPopup`:

- Props: `{ vetId: number; onEdit: (vet: Vet) => void; onClose: () => void }`.
- Fetches via `api.vets.get(vetId)` on mount; loading / error states.
- `role="dialog"`, focus-traps the close button on mount, ESC closes, backdrop-click closes.
- Sections:
  - Header: Stethoscope icon + vet name.
  - Contact chips: phone, email.
  - Address block (when any of the five address fields are set).
  - Notes block (when non-empty).
- Footer: Close + Edit Vet buttons.

Edit handoff: `onEdit` receives the hydrated `Vet` record; the parent popup closes this popup and opens `<VetForm vet={...} />`.

### Wiring in `PetDetailsPopup`

Replace the current `#<id>` placeholder in the vet-override section with a `<button>` that:

- Renders the name from `pet.vet_override_details?.name` (falls back to `#id` only if `details` is missing — defensive).
- On click, sets local state `openVetId = pet.vet_override_details!.id`.
- Renders `<VetDetailsPopup>` conditionally on that state.
- Renders `<VetForm>` when the Edit button inside the vet popup fires.

### Wiring in `OwnerDetailsPopup`

Same pattern, two entries: primary vet and emergency vet. Each line becomes a button when the nested `*_details` block is present.

### Why parent popup owns `<VetForm>` rather than the page?

Keeping the drill-down contained to the popup itself:

- Avoids leaking popup-internal state (which vet is "zoomed in") up to the page.
- Mirrors how the Vets page itself already composes `<VetList>` + `<VetForm>` — the form is just a modal you toggle on top.
- Keeps `/pets/page.tsx` and `/owners/page.tsx` diff-free for this change.

The page only ever sees the outermost popup.

## Tests

Backend tests added to `backend/pets/tests/test_vet_api.py` (or the existing serializer tests in `test_pet_api.py` / `test_owner_api.py`):

- `PetSerializer` returns `vet_override_details` with the vet's id + name when `vet_override` is set; returns `null` when it isn't.
- `OwnerSerializer` and `OwnerWithPetsSerializer` return `primary_vet_details` and `emergency_vet_details` with the vet's id + name when set; `null` otherwise.

Frontend verification:

- `tsc --noEmit` — zero errors.
- `npm run lint` — zero lint errors.
- `npm run build` — passes.

Manual check: open a pet that has a `vet_override` → pet details popup renders the vet's name as a button → click → vet details popup opens with full name + address + contact + notes. Same flow from an owner with a `primary_vet` / `emergency_vet`.
