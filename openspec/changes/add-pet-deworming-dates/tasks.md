# Tasks — Pet deworming-date tracking

## Backend

- [x] Add `last_internal_deworming_date` and `last_external_deworming_date` to `domain/pets/models.py`.
- [x] Generate `pets/migrations/0013_pet_last_external_deworming_date_and_more.py`.
- [x] Seed the `deworming_tracking` flag (`feature_flags/migrations/0003_seed_deworming_tracking.py`).
- [x] Append `deworming_tracking` to the canonical seed-tests sets in `feature_flags/tests.py`.
- [x] Add `pets.tests.test_pet_api`: default-null, create-with-dates, patch-clear-with-null, patch-set-external.
- [x] Run `make test-backend` — all green.

## Translations

- [x] Add EN keys: `pet.lastInternalDewormingDate`, `pet.lastExternalDewormingDate`, `pet.lastInternalDewormingHint`, `pet.lastExternalDewormingHint`.
- [x] Add ES keys mirroring the EN structure.

## Frontend

- [x] Extend `Pet` and `PetFormData` in `frontend/src/domain/pets/types.ts`.
- [x] Hook up `useFeatureFlag('deworming_tracking')` in `PetForm.tsx`.
- [x] Default the two fields to `null` in the `defaultFormData(...)` helper and the editing-state initializer.
- [x] Render the two `<input type="date">` blocks (with hints) inside the existing physical-attributes grid behind the flag.
- [x] In `PetDetailsPopup.tsx` add a 2-column grid (before `special_notes`) showing the two dates, with `formatIsoDate` and `—` for null.
- [x] In `PetList.tsx` add the same 2-column grid in the expanded accordion view.
- [x] Run `npx tsc --noEmit` — clean.

## Verification

- [x] Backend tests pass (311 / 311).
- [x] Frontend typecheck passes.
- [x] Manual smoke test once the user enables the flag (out of scope here — flag is disabled by default).

## Out of scope

- No "due soon" notifications, no reminder banners.
- No deworming-treatment history (single date per type).
- No data backfill — every existing pet starts with both dates `null`.
