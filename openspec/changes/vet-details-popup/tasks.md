# Tasks

## 1. Backend serializer enrichment

- [x] 1.1 Add `VetListSerializer` (`id`, `name`, `phone`, `email`, `city`) in `backend/pets/serializers.py`.
- [x] 1.2 Extend `PetSerializer` with `vet_override_details = VetListSerializer(source='vet_override', read_only=True)`.
- [x] 1.3 Extend `OwnerSerializer` with `primary_vet_details` and `emergency_vet_details` (same projection, sourced from the corresponding FK fields, read-only).
- [x] 1.4 Extend `OwnerWithPetsSerializer` with the same two fields and add them to the `fields` tuple.

## 2. Backend tests

- [x] 2.1 Add a test in `backend/pets/tests/test_vet_api.py` (or `test_pet_api.py`) that asserts `PetSerializer` returns `vet_override_details` with `id + name` when `vet_override` is set, and `None` otherwise.
- [x] 2.2 Add a test asserting `OwnerSerializer` returns `primary_vet_details` and `emergency_vet_details` with the right ids + names when both FKs are populated, and `None` when they are not.
- [x] 2.3 Add a test asserting `OwnerWithPetsSerializer` (the payload used by `/api/owners/<id>/`) exposes both `*_details` fields.

## 3. Frontend types

- [x] 3.1 Add `vet_override_details?: VetListItem | null` to `Pet` in `frontend/src/domain/pets/types.ts`.
- [x] 3.2 Add `primary_vet_details?: VetListItem | null` and `emergency_vet_details?: VetListItem | null` to `Owner` in `frontend/src/domain/owners/types.ts`.
- [x] 3.3 Import `VetListItem` in both type files (from `@/domain/vets/types`).

## 4. Frontend: VetDetailsPopup component

- [x] 4.1 Create `frontend/src/components/VetDetailsPopup.tsx`.
  - Props: `vetId`, `onEdit`, `onClose`.
  - Fetches the vet via `api.vets.get(id)` on mount; loading + error states.
  - Read-only sections: header (Stethoscope icon + name), contact chips (phone / email), address block, notes block.
  - Footer: Close + Edit Vet buttons.
  - `role="dialog"`, focus the close button on mount, ESC closes, backdrop-click closes.

## 5. Frontend: wiring

- [x] 5.1 `PetDetailsPopup`: replace the `#<id>` placeholder with a `<button>` showing `pet.vet_override_details?.name`. On click, open a nested `<VetDetailsPopup>`. Edit handoff: close the vet popup, open `<VetForm vet={...} />`.
- [x] 5.2 `OwnerDetailsPopup`: replace both vet placeholders with buttons showing `owner.primary_vet_details?.name` and `owner.emergency_vet_details?.name`. Share a single nested `<VetDetailsPopup>` with a state slot keyed on whichever was clicked.
- [x] 5.3 Both popups: when the nested `*_details` block is missing but the raw FK id is present (old cached payload), fall back to the existing `#<id>` placeholder so the UI degrades silently.

## 6. Translations

- [x] 6.1 Add `vet.detailsPopup.*` namespace in both `backend/translations/en.json` and `backend/translations/es.json`:
  - `title` — "Vet details" / "Detalles del veterinario".
  - `loading` — "Loading vet…" / "Cargando veterinario…".
  - `loadFailed` — "Failed to load vet" / "Error al cargar el veterinario".
  - `editVet` — reuses existing `vet.editVet` key.

## 7. Specs

- [x] 7.1 Write `openspec/changes/vet-details-popup/specs/frontend/vets/spec.md` — ADDED requirement for the new `VetDetailsPopup`.
- [x] 7.2 Write `openspec/changes/vet-details-popup/specs/frontend/pets/spec.md` — ADDED requirement: vet_override reference in the pet details popup becomes a click target with the vet's name.
- [x] 7.3 Write `openspec/changes/vet-details-popup/specs/frontend/owners/spec.md` — ADDED requirement: primary / emergency vet references in the owner details popup become click targets with the vet's name.
- [x] 7.4 Write `openspec/changes/vet-details-popup/specs/backend/pets/spec.md` — MODIFIED delta: PetSerializer payload SHALL include `vet_override_details`.
- [x] 7.5 Write `openspec/changes/vet-details-popup/specs/backend/owners/spec.md` — MODIFIED delta: Owner serializers SHALL include `primary_vet_details` and `emergency_vet_details`.
- [x] 7.6 Append the same requirements to the baseline `openspec/specs/frontend/{vets,pets,owners}/spec.md` and `openspec/specs/backend/{pets,owners}/spec.md` when archiving.

## 8. Verification

- [x] 8.1 `make test-backend` — all tests pass.
- [x] 8.2 `cd frontend && npm run lint` — zero lint errors.
- [x] 8.3 `cd frontend && npm run build` — TypeScript + Next.js compile cleanly.
- [x] 8.4 Manual: open a pet with a vet override → popup shows the vet's name → click → vet popup opens → Edit → vet form opens.
- [x] 8.5 Manual: open an owner with a primary and an emergency vet → popup shows both names → click each → vet popup opens with the correct vet.
- [x] 8.6 Manual: ESC closes the inner vet popup without closing the outer pet / owner popup.
