# Proposal: Add Pets From the Owner List

## Intent

Pets always belong to an owner, and creating a pet requires picking an owner first. Today, users create pets from the Pets page, where they must re-select the owner every time from a dropdown. When registering multiple pets for a freshly created owner, this flow is slow and error-prone. The improvement is to drive pet creation from the owner list: an owner card exposes an "Add Pet" action that opens the pet form with the owner pre-filled and locked. Users can also save the current pet and immediately create another pet for the same owner, backed by a toast notification that confirms success.

## Scope

In scope:
- Add a per-owner "Add Pet" action inside the expanded owner card on the /owners page.
- Extend `PetForm` with a `lockedOwnerId` prop. When set, the owner field is hidden (not editable) and the form is pre-gated.
- Add a "Save & Add Another" button in `PetForm` create mode that saves the current pet and immediately resets the form for another pet under the same owner.
- Introduce a small app-wide toast system (`ToastProvider` + `useToast` hook + `Toast` component) to show transient success feedback, and wire it into the root layout.
- Show a success toast after the pet is created (on both "Save" and "Save & Add Another").
- Remove the "Add Pet" button from the /pets page (pet creation is now driven exclusively from the owner list).
- Remove the "create a new owner first" affordance from the pet form (no owner switching happens inside the pet form anymore).
- Add a Playwright E2E test covering the add-pet-from-owner-list flow, including the "Save & Add Another" behavior and the toast notification.
- Update existing Playwright pet tests to open the pet form from the owner list instead of the /pets page.
- Add translation keys for the new UI in English and Spanish.

Out of scope:
- Backend changes: the pet creation API already accepts an `owner` foreign key; no endpoint changes are needed.
- Editing pets: editing is still triggered from the /pets list and from the expanded owner card (unchanged).
- Creating owners from the pet form (previously implicit via the dropdown's "no owner" state): removed because the new entry point makes it unnecessary.
- Broader toast usage across the app: only the "pet created" success path uses the toast in this change. Other notification sites remain as-is.
- Changing the pet profile picture flow: the existing `pendingProfilePicture` + `createWithAvatar` path continues to work with the locked owner.

## Approach

- **Frontend (entry point)**: The /owners page renders each owner as an expandable card. When expanded, the "Pets (N)" header already has a "Schedule All Pets" button; alongside it, a new "Add Pet" button opens the pet form modal with the owner pre-selected via `lockedOwnerId`. When the modal closes, the expanded owner's pet list is re-fetched so newly created pets appear without a full page reload.
- **Frontend (PetForm)**: Add an optional `lockedOwnerId?: number` prop. When present, initialise `formData.owner = lockedOwnerId`, hide the owner `<select>` block entirely (no dropdown, no helper hint), and drop the `isOwnerSelected` gating (the form is always enabled since the owner is locked). In create mode, add a "Save & Add Another" button next to "Save". Clicking it performs the usual create request, triggers `onSave()`-equivalent refresh behavior via a new `onSaveAndAnother?: () => void` callback (or re-use the existing `onSave` semantics), resets `formData` to defaults while keeping `owner = lockedOwnerId`, clears the pending profile picture and vaccinations, keeps the modal open, and fires a success toast.
- **Frontend (Toast system)**: Introduce `src/components/ui/Toast.tsx` exporting `ToastProvider`, `useToast` and a small top-right stack of toasts. Toasts auto-dismiss after ~4 seconds and support variants (`success`, `error`). `ToastProvider` is wrapped inside `TranslationProvider` in `src/app/layout.tsx` so the entire app can call `useToast()`. No external library is added (keeps the zero-dep footprint consistent with the rest of the UI components).
- **Frontend (/pets page)**: Remove the "Add Pet" button in the page header. Keep the pet list, edit and delete flows intact.
- **Translations**: Add `owner.addPet` ("Add Pet" / "Agregar Mascota"), `pet.saveAndAddAnother` ("Save & Add Another" / "Guardar y Agregar Otra"), and `pet.addedSuccessfully` ("{name} added successfully" / "{name} agregada con éxito") to both `en.json` and `es.json`. Note `pet.addPet` already exists and is reused for the button label inside `PetForm`.
- **Tests**: The Playwright `pets.spec.ts` suite currently opens the pet form by clicking "Add Pet" on /pets. Rewrite those tests to create an owner via the API (via the existing `OwnerForm` UI or the REST API in the test helper), then open the form from the expanded owner card. Add a new test covering "Save & Add Another" (creates two pets for one owner in a single modal session) and the success toast.
