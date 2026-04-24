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

- `PetSerializer`: add three vet projections, all read-only:
  - `vet_override_details = VetListSerializer(source='vet_override', read_only=True)` — the overridden vet set directly on the pet. Mirrors the existing FK column.
  - `effective_vet_details` as a `SerializerMethodField` that returns the `VetListSerializer` projection of `obj.effective_vet` (override → owner's primary → `None`). This is the **emergency-access field**: it always resolves to the vet actually responsible for the pet, which is what a staff member calling a clinic mid-emergency needs.
  - `emergency_vet_details` as a `SerializerMethodField` that reads `obj.owner.emergency_vet` when the pet has an owner, else `None`. We surface it on the pet (rather than requiring the UI to look up the owner separately) so the `/pets` list accordion can render it in one shot from a single `api.pets.list()` call.
  - Leave the existing `vet_override` FK column writable as before; only the nested projections are read-only.
- `OwnerSerializer`: add `primary_vet_details` and `emergency_vet_details`, same `VetListSerializer` projection, sourced from `primary_vet` / `emergency_vet`. Keep the raw FK columns too.
- `OwnerWithPetsSerializer`: add the same two `*_details` fields so the `/api/owners/<id>/` response used by `OwnerDetailsPopup` carries both vet previews.

This mirrors the existing `owner_details` pattern on `PetSerializer` — one parent field backed by the FK id, one nested projection for reads.

### Why `effective_vet_details` as well as `vet_override_details`?

The two are not redundant:

- `vet_override_details` — what the pet's form wrote. Only populated when the operator explicitly set a per-pet override. Used by the pet-details popup to reflect what's in the pet record.
- `effective_vet_details` — what the pet *currently has*. Falls back to the owner's primary vet when there is no override. Used by the **pet list accordion** because that's the vet the operator wants to phone in an emergency, not the empty override slot.

Keeping both avoids either mis-labeling the field on a surface (showing "Vet override" when the real value came from the owner) or running two lookups on the client.

### Why surface `emergency_vet_details` on the pet?

The pet's emergency vet *is* the owner's emergency vet — there is no pet-level emergency vet field. Without this projection, the `/pets` accordion would either:

1. Skip the emergency vet entirely (worse UX for emergencies), or
2. Have to call `/api/owners/<id>/` for every expanded pet to read `owner.emergency_vet`.

Neither is acceptable. Projecting it onto `PetSerializer` makes the emergency path a single round-trip and keeps `OwnerListSerializer` (used inside `PetSerializer.owner_details`) compact.

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
| `Pet` | `effective_vet_details?: VetListItem \| null` | Resolved server-side (override → owner primary → null). Used by the `/pets` list accordion. |
| `Pet` | `emergency_vet_details?: VetListItem \| null` | Owner's emergency vet. `null` when the pet has no owner or the owner has no emergency vet. |
| `Owner` | `primary_vet_details?: VetListItem \| null` | Populated whenever `primary_vet` is set. |
| `Owner` | `emergency_vet_details?: VetListItem \| null` | Populated whenever `emergency_vet` is set. |
| `OwnerWithPets` | same two as above. | Inherited via `extends Owner` (no change needed there — the base already carries them). |

All fields are optional on the TS side because older cached payloads (on a stale browser tab after a backend upgrade) would not include them; the surfaces treat "`details` missing" identically to "null" and simply hide the row.

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
- Keeps `/pets/page.tsx` and `/owners/page.tsx` diff-free for *the popup case*.

The page only ever sees the outermost popup.

### List-surface wiring

**Pet list (`frontend/src/components/PetList.tsx`).** Inside the existing expanded-accordion content (`expandedPetId === pet.id`), add a `<VetEmergencyBlock>` sub-section below the 3-column profile grid, above the `special_notes` block. The block renders:

- A small heading ("Veterinary", pulled from the existing `owner.veterinarySection` translation key so there's one string to maintain).
- One row per resolvable vet: "Vet: <name> · <phone>" and "Emergency vet: <name> · <phone>". Name is a `<button>` that sets local state `openVetId`. Phone is rendered as-is next to the name (non-interactive text). When a vet row has no phone recorded, the phone column shows a muted filler via `t('vet.noPhone')`.
- If both `effective_vet_details` and `emergency_vet_details` are `null`, the block isn't rendered at all — we don't show an empty placeholder.

`PetList` already has zero popup state; this change adds `openVetId` and `editingVet` alongside the existing `expandedPetId`. The component renders a single `<VetDetailsPopup>` + `<VetForm>` pair at the bottom of its output, shared across all pet rows — only one vet popup can be open at a time.

Flag gate: the whole block is wrapped in `if (vetManagementEnabled)`, same as the popups.

**Owners page (`frontend/src/app/owners/page.tsx`).** Inside the accordion block (`expandedOwner === owner.id && ownerDetails[owner.id]`), add the same sub-section using the owner's `primary_vet_details` / `emergency_vet_details`. The owners page already owns a fair amount of modal state (`PetForm`, `ScheduleForm`, `PetDetailsPopup`); adding `openVetId` + `editingVet` + a single `<VetDetailsPopup>` + `<VetForm>` is ~20 lines.

### Emergency-first UX contract

Both list surfaces lean on three principles:

1. **One click to reveal.** Expand the accordion; the vet block is visible immediately with no further interaction required.
2. **Read the phone without opening the popup.** The phone is rendered next to the name so an emergency call doesn't require even one more click.
3. **One more click to read the full record.** Clicking the name opens the `VetDetailsPopup`, which re-fetches the full record (including the address and notes) for more context when the phone number isn't enough.

## Tests

Backend tests added to `backend/pets/tests/test_vet_api.py`:

- `PetSerializer` returns `vet_override_details` with the vet's id + name when `vet_override` is set; `null` when it isn't.
- `PetSerializer` returns `effective_vet_details` populated from the override when set, from the owner's primary vet when there is no override, and `null` when neither is available.
- `PetSerializer` returns `emergency_vet_details` populated from the owner's emergency vet; `null` when the pet has no owner or the owner has no emergency vet.
- `OwnerSerializer` and `OwnerWithPetsSerializer` return `primary_vet_details` and `emergency_vet_details` with the vet's id + name when set; `null` otherwise.

Frontend verification:

- `tsc --noEmit` — zero errors (run in a throw-away `node:22-alpine` container; the production container doesn't ship dev tooling).
- `npm run build` — passes.

Manual checks:

- Open a pet that has a `vet_override` → pet details popup renders the vet's name as a button → click → vet details popup opens with full name + address + contact + notes.
- Same flow from an owner with a `primary_vet` / `emergency_vet`.
- Expand a pet card on `/pets` → the Veterinary block shows the effective vet (override or owner-primary) and the emergency vet (owner's) with phone numbers inline.
- Expand an owner card on `/owners` → same block with owner's primary and emergency vets.
- Click a vet row from either list accordion → `VetDetailsPopup` opens on top of the list; closing returns to the list with the accordion still expanded.
