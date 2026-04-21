# Tasks

## 1. Domain module
- [x] 1.1 Create `frontend/src/domain/vets/types.ts` with `Vet`, `VetFormData`, `VetListItem`.
- [x] 1.2 Create `frontend/src/domain/vets/api.ts` with `vetsApi` (list / get / create / update / delete).
- [x] 1.3 Create `frontend/src/domain/vets/index.ts` barrel.
- [x] 1.4 Register `vetsApi` on the `api` object in `frontend/src/lib/api.ts` and re-export the types.

## 2. Existing type updates
- [x] 2.1 Add `primary_vet: number | null` and `emergency_vet: number | null` to `Owner` and `OwnerWithPets` in `frontend/src/domain/owners/types.ts`.
- [x] 2.2 Add the same fields to `OwnerFormData` as optional nullable.
- [x] 2.3 Add `vet_override: number | null` to `Pet` in `frontend/src/domain/pets/types.ts` and as optional nullable on `PetFormData`.

## 3. Components
- [x] 3.1 Create `frontend/src/components/VetForm.tsx` (modal form mirroring OwnerForm layout minus the profile picture).
- [x] 3.2 Create `frontend/src/components/VetList.tsx` (searchable card list with edit / delete).

## 4. Page
- [x] 4.1 Create `frontend/src/app/vets/page.tsx` using `VetList` + `VetForm`, wrapped in `withAuth`.

## 5. Navigation
- [x] 5.1 Add a "Vets" entry to `frontend/src/components/Navigation.tsx` (desktop nav + mobile sheet). Pick a Lucide icon (e.g. `Stethoscope`).

## 6. Owner form integration
- [x] 6.1 Fetch `api.vets.list()` on mount.
- [x] 6.2 Add primary / emergency vet `<select>` elements in a new "Veterinary" section.
- [x] 6.3 Send `primary_vet` and `emergency_vet` with create / update payloads.

## 7. Pet form integration
- [x] 7.1 Fetch `api.vets.list()` on mount (parallel with existing fetches).
- [x] 7.2 Add a single `<select>` for `vet_override` with hint text about the resolution order.
- [x] 7.3 Include `vet_override` in create / update payloads.

## 8. Translations
- [x] 8.1 Add `vet.*` namespace, `nav.vets`, `confirmations.deleteVet`, `errors.vetLoadFailed`, and `owner.primaryVet` / `owner.emergencyVet` / `owner.veterinarySection` / `pet.vetOverride` / `pet.vetOverrideHint` / `pet.noVetOverride` to both `backend/translations/en.json` and `backend/translations/es.json`.
- [x] 8.2 Verify both JSON files parse via `python3 -c "import json; json.load(open(p))"`.

## 9. Specs
- [x] 9.1 Create `openspec/changes/vet-frontend/specs/frontend/vets/spec.md` (ADDED delta).
- [x] 9.2 Create MODIFIED deltas for `frontend/owners` and `frontend/pets`.
- [x] 9.3 Mirror as new baseline `openspec/specs/frontend/vets/spec.md`; update `openspec/specs/frontend/owners/spec.md` and `openspec/specs/frontend/pets/spec.md` with the new vet-integration requirements.

## 10. Verification
- [x] 10.1 `docker compose run --rm -T frontend npx tsc --noEmit` — no new TS errors.
- [x] 10.2 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` — 252 backend tests still green.
- [x] 10.3 Manual: open the stack, navigate to `/vets`, add a vet, assign it to an owner's `primary_vet`, assign a different vet as a pet's `vet_override`, confirm both round-trip via the UI.
