# Tasks

## 1. Backend serializer enrichment

- [x] 1.1 Add `VetListSerializer` (`id`, `name`, `phone`, `email`, `city`) in `backend/pets/serializers.py`.
- [x] 1.2 Extend `PetSerializer` with `vet_override_details = VetListSerializer(source='vet_override', read_only=True)`.
- [x] 1.3 Extend `OwnerSerializer` with `primary_vet_details` and `emergency_vet_details` (same projection, sourced from the corresponding FK fields, read-only).
- [x] 1.4 Extend `OwnerWithPetsSerializer` with the same two fields and add them to the `fields` tuple.
- [x] 1.5 Extend `PetSerializer` with `effective_vet_details` — a read-only `SerializerMethodField` that returns `VetListSerializer(obj.effective_vet).data` when the resolver returns a vet, else `None`.
- [x] 1.6 Extend `PetSerializer` with `emergency_vet_details` — a read-only `SerializerMethodField` that returns `VetListSerializer(obj.owner.emergency_vet).data` when the pet has an owner with an emergency vet, else `None`.

## 2. Backend tests

- [x] 2.1 Add a test in `backend/pets/tests/test_vet_api.py` that asserts `PetSerializer` returns `vet_override_details` with `id + name` when `vet_override` is set, and `None` otherwise.
- [x] 2.2 Add a test asserting `OwnerSerializer` returns `primary_vet_details` and `emergency_vet_details` with the right ids + names when both FKs are populated, and `None` when they are not.
- [x] 2.3 Add a test asserting `OwnerWithPetsSerializer` (the payload used by `/api/owners/<id>/`) exposes both `*_details` fields.
- [x] 2.4 Add a test asserting `PetSerializer.effective_vet_details` follows the resolver: override when set, owner's primary when no override, and `None` when neither resolves.
- [x] 2.5 Add a test asserting `PetSerializer.emergency_vet_details` returns the owner's emergency vet when present; `None` when the pet has no owner or the owner has no emergency vet.

## 3. Frontend types

- [x] 3.1 Add `vet_override_details?: VetListItem | null` to `Pet` in `frontend/src/domain/pets/types.ts`.
- [x] 3.2 Add `primary_vet_details?: VetListItem | null` and `emergency_vet_details?: VetListItem | null` to `Owner` in `frontend/src/domain/owners/types.ts`.
- [x] 3.3 Import `VetListItem` in both type files (from `@/domain/vets/types`).
- [x] 3.4 Add `effective_vet_details?: VetListItem | null` and `emergency_vet_details?: VetListItem | null` to `Pet`.

## 4. Frontend: VetDetailsPopup component

- [x] 4.1 Create `frontend/src/components/VetDetailsPopup.tsx`.
  - Props: `vetId`, `onEdit`, `onClose`.
  - Fetches the vet via `api.vets.get(id)` on mount; loading + error states.
  - Read-only sections: header (Stethoscope icon + name), contact chips (phone / email), address block, notes block.
  - Footer: Close + Edit Vet buttons.
  - `role="dialog"`, focus the close button on mount, ESC closes, backdrop-click closes.

## 5. Frontend: popup wiring

- [x] 5.1 `PetDetailsPopup`: replace the `#<id>` placeholder with a `<button>` showing `pet.vet_override_details?.name`. On click, open a nested `<VetDetailsPopup>`. Edit handoff: close the vet popup, open `<VetForm vet={...} />`.
- [x] 5.2 `OwnerDetailsPopup`: replace both vet placeholders with buttons showing `owner.primary_vet_details?.name` and `owner.emergency_vet_details?.name`. Share a single nested `<VetDetailsPopup>` with a state slot keyed on whichever was clicked.
- [x] 5.3 Both popups: when the nested `*_details` block is missing but the raw FK id is present (old cached payload), fall back to the existing `#<id>` placeholder so the UI degrades silently.

## 6. Frontend: list-surface wiring (emergency access)

- [x] 6.1 `PetList.tsx`: inside the expanded-accordion content, add a "Veterinary" block below the 3-column profile grid and above the `special_notes` block. Render one row for the effective vet and one for the emergency vet (hide rows whose `*_details` is `null`; hide the whole block if both are null).
- [x] 6.2 Each row: vet name as a `<button>` (opens `VetDetailsPopup`) and phone rendered inline beside the name.
- [x] 6.3 Add `openVetId` + `editingVet` state to `PetList`. Render one `<VetDetailsPopup>` + one `<VetForm>` at the end of the component, shared across rows. Flag-gate via `vet_management`.
- [x] 6.4 `/owners/page.tsx`: inside the owner accordion body, add the same Veterinary block between the existing "Notes" paragraph and the "Pets" section header. Use `owner.primary_vet_details` and `owner.emergency_vet_details`.
- [x] 6.5 Add `openVetId` + `editingVet` state to the owners page. Render one `<VetDetailsPopup>` + one `<VetForm>` alongside the existing modal render block. Flag-gate via `vet_management`.

## 7. Translations

- [x] 7.1 Add `vet.detailsPopup.*` namespace in both `backend/translations/en.json` and `backend/translations/es.json`:
  - `title` — "Vet details" / "Detalles del veterinario".
  - `loading` — "Loading vet…" / "Cargando veterinario…".
  - `loadFailed` — "Failed to load vet" / "Error al cargar el veterinario".
  - `editVet` — reuses existing `vet.editVet` key.
- [x] 7.2 Add `pet.effectiveVet` and `pet.emergencyVet` labels for the list row captions.
- [x] 7.3 Add `vet.noPhone` muted filler for vets without a recorded phone number.

## 8. Specs

- [x] 8.1 Write `openspec/changes/vet-details-popup/specs/frontend/vets/spec.md` — ADDED requirement for the new `VetDetailsPopup`.
- [x] 8.2 Write `openspec/changes/vet-details-popup/specs/frontend/pets/spec.md` — ADDED requirement: vet_override reference in the pet details popup becomes a click target with the vet's name.
- [x] 8.3 Write `openspec/changes/vet-details-popup/specs/frontend/owners/spec.md` — ADDED requirement: primary / emergency vet references in the owner details popup become click targets with the vet's name.
- [x] 8.4 Write `openspec/changes/vet-details-popup/specs/backend/pets/spec.md` — MODIFIED delta: PetSerializer payload SHALL include `vet_override_details`.
- [x] 8.5 Write `openspec/changes/vet-details-popup/specs/backend/owners/spec.md` — MODIFIED delta: Owner serializers SHALL include `primary_vet_details` and `emergency_vet_details`.
- [x] 8.6 Extend `specs/backend/pets/spec.md` (delta) with `effective_vet_details` + `emergency_vet_details` requirements.
- [x] 8.7 Extend `specs/frontend/pets/spec.md` (delta) with the PetList emergency-access Veterinary block requirement.
- [x] 8.8 Extend `specs/frontend/owners/spec.md` (delta) with the Owners page emergency-access Veterinary block requirement.
- [x] 8.9 Append all requirements to the baseline `openspec/specs/frontend/{vets,pets,owners}/spec.md` and `openspec/specs/backend/{pets,owners}/spec.md` when archiving.

## 9. Verification

- [x] 9.1 `make test-backend` — all tests pass.
- [x] 9.2 `cd frontend && npm run build` — TypeScript + Next.js compile cleanly.
- [x] 9.3 Manual: open a pet with a vet override → popup shows the vet's name → click → vet popup opens → Edit → vet form opens.
- [x] 9.4 Manual: open an owner with a primary and an emergency vet → popup shows both names → click each → vet popup opens with the correct vet.
- [x] 9.5 Manual: ESC closes the inner vet popup without closing the outer pet / owner popup.
- [x] 9.6 Manual: expand a pet card on `/pets` → Veterinary block visible with both vets + phone numbers; click a vet → VetDetailsPopup opens; close → accordion still expanded.
- [x] 9.7 Manual: expand an owner card on `/owners` → same block, same flow.
