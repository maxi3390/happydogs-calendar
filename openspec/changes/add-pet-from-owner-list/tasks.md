# Tasks

## 1. Toast system (new capability)
- [x] 1.1 Create `frontend/src/components/ui/Toast.tsx` exporting `ToastProvider`, `useToast`, and the visual `Toast` card.
- [x] 1.2 Auto-dismiss toasts after 4 seconds by default, with a manual close button.
- [x] 1.3 Support `success` and `error` variants with appropriate icons and color tokens.
- [x] 1.4 Wrap the app in `ToastProvider` inside `TranslationProvider` in `frontend/src/app/layout.tsx`.

## 2. PetForm
- [x] 2.1 Add optional `lockedOwnerId?: number` prop to `PetFormProps`.
- [x] 2.2 When `lockedOwnerId` is set in create mode, initialise `formData.owner = lockedOwnerId` and force-enable the form.
- [x] 2.3 Hide the owner `<select>` block (and its helper hint) entirely when the owner is locked.
- [x] 2.4 Add a "Save & Add Another" button in create mode that submits, resets the form for another pet under the same owner, fires a success toast, and keeps the modal open.
- [x] 2.5 Add an optional `onSaveAndAnother?: (pet: Pet) => void` callback so the parent can refresh background state without closing the modal.
- [x] 2.6 On successful save (either button), fire a success toast via `useToast()` using the translation key `pet.addedSuccessfully` (supports `{name}` interpolation).
- [x] 2.7 Remove the now-unused "assign owner or create a new owner first" hint when the owner is locked.

## 3. Owners page
- [x] 3.1 Add per-owner "Add Pet" button in the expanded owner card, next to the "Pets (N)" section header.
- [x] 3.2 Wire the button to open the existing `PetForm` modal with `lockedOwnerId={owner.id}`.
- [x] 3.3 On `onSave` (modal closes), refresh both `ownerDetails[owner.id]` and the owner list so the new pet and updated pet count appear.
- [x] 3.4 On `onSaveAndAnother` (modal stays open), refresh the same state but leave the modal open.

## 4. Pets page
- [x] 4.1 Remove the "Add Pet" button from the page header on `/pets`.
- [x] 4.2 Remove the associated "add" branch and `Plus` import if no longer used. Keep edit and delete flows intact.

## 5. Translations
- [x] 5.1 Add `owner.addPet` ("Add Pet" / "Agregar Mascota") to `backend/translations/{en,es}.json`.
- [x] 5.2 Add `pet.saveAndAddAnother` ("Save & Add Another" / "Guardar y Agregar Otra") to both files.
- [x] 5.3 Add `pet.addedSuccessfully` ("{name} added successfully" / "{name} agregada con éxito") to both files.
- [x] 5.4 Mirror the new keys in `frontend/tests/helpers.ts` so Playwright E2E tests receive the mocked strings.

## 6. E2E tests
- [x] 6.1 Update `frontend/tests/pets.spec.ts` beforeEach to open the pet form via /owners (create an owner via API, expand the card, click "Add Pet").
- [x] 6.2 Keep the existing form-field-presence assertions working against the new entry point.
- [x] 6.3 Add a test for "Save & Add Another" that creates two pets under the same owner and verifies the toast after each save.
- [x] 6.4 Assert that the /pets page no longer exposes the "Add Pet" button.

## 7. Verification
- [x] 7.1 Run backend tests (`make test` or equivalent) to make sure nothing regressed. No backend changes are expected, but the pet CRUD tests should still pass.
- [x] 7.2 `python -m py_compile` on any touched Python files (none expected).
- [x] 7.3 Smoke-build the frontend (`npm run build` or `npm run lint`) to catch TS errors introduced by the new props/toast hook.
