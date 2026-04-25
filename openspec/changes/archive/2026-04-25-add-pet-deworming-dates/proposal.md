# Add pet deworming-date tracking

## Why

Operators want to record the last internal (intestinal) and the last external (flea/tick) deworming treatment per pet so that staff and the owners can see at a glance when the next round is due. Today there is no field for either; the only freeform place to capture this is `special_notes`, which is unstructured and not surfaced consistently.

## What

Add two optional date fields to the `Pet` model and surface them in the Pet form, the Pet detail popup, and the Pet list accordion:

- `last_internal_deworming_date` — date of the last intestinal-parasite treatment.
- `last_external_deworming_date` — date of the last flea / tick treatment.

Both are nullable (`DateField(null=True, blank=True)`) and follow the existing `birth_date` precedent.

Surface the new inputs and read views behind a new feature flag `deworming_tracking`, disabled by default. Backend always accepts and persists the values regardless of the flag so toggling the flag never loses data.

## Scope (in)

- New model fields + Django migration on the `pets` app.
- New `deworming_tracking` feature flag, seeded disabled.
- Frontend `Pet` and `PetFormData` types extended.
- `PetForm` shows two `<input type="date">` fields when the flag is on.
- `PetDetailsPopup` and `PetList` (expanded accordion) render the two dates when the flag is on; missing values render as `—`.
- EN / ES translations for the new labels and hints.
- Backend tests covering create / partial-update / clear-with-null.
- Frontend tests cover any feature-flag gated UI behavior we already test for similar flags.

## Scope (out)

- No notifications or "due soon" reminders. Just storing and showing the dates is enough for now.
- No history of all past deworming treatments — only the most recent date per type. (Vaccinations already model the "list of treatments" pattern; deworming is intentionally simpler.)
- No frontend admin UI changes — the flag is toggled through the existing `/admin/feature-flags/` page.

## Approach

1. **Backend model + migration** mirroring the existing `birth_date` field shape.
2. **Feature flag seed** in a new `feature_flags` migration so the new key shows up wherever `FeatureFlag.objects.all()` is iterated.
3. **Serializer** is `fields = '__all__'`, so no changes needed.
4. **Frontend** — extend types, add a flag-gated section to PetForm, add a flag-gated section to PetDetailsPopup and the PetList accordion (both using the same `formatIsoDate` + grid layout for consistency).
5. **Tests** — extend the backend `pets.tests.test_pet_api` with create / null-default / patch-clear scenarios; update the canonical-flag set in `feature_flags.tests` so adding a flag without the seed migration breaks loudly (existing convention).
