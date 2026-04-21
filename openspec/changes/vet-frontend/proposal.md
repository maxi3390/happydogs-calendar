# Proposal — Vet frontend

## Intent

Land the frontend surface that was deliberately deferred by the `vet-model` backend change. The backend already exposes `/api/vets/`, the `Owner.primary_vet` / `Owner.emergency_vet` FKs, and the `Pet.vet_override` FK plus the `effective_vet` resolver. The UI currently has no way to reach any of it.

## Scope

### In scope

- A new `frontend/src/domain/vets/` module (`types.ts`, `api.ts`, `index.ts`) and its registration under `api` in `frontend/src/lib/api.ts`.
- New TypeScript fields on `Owner` (`primary_vet`, `emergency_vet`) and `Pet` (`vet_override`) plus the corresponding form-data interfaces.
- A dedicated `/vets` page (`frontend/src/app/vets/page.tsx`) with a searchable list and add/edit/delete flow.
- New components: `VetList.tsx` (searchable card list) and `VetForm.tsx` (modal create/edit, including all Address fields inherited from the backend mixin).
- Integration in `OwnerForm.tsx`: two optional dropdowns for primary and emergency vet.
- Integration in `PetForm.tsx`: one optional dropdown for the per-pet vet override, with a hint describing the resolution order (override → owner primary → none).
- A "Vets" entry in the authenticated user's profile menu (desktop popup + mobile profile section) in `Navigation.tsx`. It does NOT live in the primary nav — vet management is a lower-frequency operation than owner / pet / calendar flows.
- Translations for all new UI text added to both `backend/translations/en.json` and `backend/translations/es.json` under a new `vet.*` namespace, plus the missing `nav.vets` key.

### Out of scope

- Any backend change. The backend already models and exposes vets.
- Profile pictures for vets (the backend model has no image field).
- A read-only `effective_vet` display on the pet detail view — can follow in a separate UX pass if the user surfaces demand. The spec contract keeps the resolver exposed by the API so a future change is additive.
- Playwright E2E coverage. The existing backend test suite already validates the REST surface; adding E2E for forms would expand scope significantly. Future follow-up.
- A `/vets/dropdown/` lightweight endpoint. We already call the existing `/api/vets/` list (small cardinality expected: a handful per nursery).

## Approach

1. Follow the existing per-domain frontend layout (`domain/<name>/{types,api,index}.ts`). Vet is almost the same shape as Owner minus pets/profile picture, so the contract mirrors what already ships.
2. For dropdowns, load the full `api.vets.list()` once at form mount. A nursery has a small number of partner vets (empirically < 50), so paging / typeahead is not warranted yet.
3. Translations use a new top-level `vet.*` namespace for consistency with `owner.*` and `pet.*`. All strings appear in both locales in the same commit to avoid missing translations at runtime.
4. The `VetForm` UX mirrors the "address section" that already appears in `OwnerForm.tsx` so returning users see a familiar layout.
