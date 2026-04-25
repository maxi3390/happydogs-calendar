# Design — Pet deworming-date tracking

## Decision summary

| Decision | Choice | Why |
|----------|--------|-----|
| Model two date fields, not one combined entity | `last_internal_deworming_date`, `last_external_deworming_date` | Internal vs external are different products with different cadences (internal ≈ every 3 months, external ≈ monthly). A single field would force the operator to throw away one half the time. |
| Nullable `DateField`, no choices, no default | `DateField(null=True, blank=True)` | Mirrors the existing `birth_date` field on `Pet`. Treats "no data yet" as a real, common state — most existing rows will start there. |
| Single date per type, not a treatment history | One column each | Vaccinations already model the "many treatments per pet" pattern (`Vaccination.pet`, `date`, `vax_type`). Deworming is high-frequency and low-information; staff want to know "when was the last one" — past dates are not actionable. If history becomes interesting later we can add a sibling `DewormingTreatment` table without a destructive migration. |
| Feature-flag the surface, not the storage | Backend always accepts & persists; flag controls UI | Lets operators capture the dates immediately for piloting, then enable the flag globally once they have data to look at. Never silently throws away values that exist. |
| New flag default | Disabled | Matches the project convention for opt-in features (compare: `custom_pet_species`). The seed migration's `get_or_create` keeps re-runs idempotent. |
| Display "no record yet" | em-dash `—` | Same convention used elsewhere in the popup (`formatWeight(...) ?? '—'`). |
| Date display format | `formatIsoDate` (`dd/MM/yyyy`) | Matches every other date the operator sees — schedule ranges, vaccinations. The form uses a native `<input type="date">` whose own representation is browser/locale dependent, which is the existing pattern (e.g. for `birth_date`). |
| Where to show it on the form | After `neutered`, inside the same `grid grid-cols-1 md:grid-cols-2 gap-4` | Treats deworming as a "physical-state" attribute alongside birth_date / weight / neutered, which is how staff think about it. Keeps the form's existing rhythm of paired fields. |
| Where to show it on the read view | `PetDetailsPopup` and `PetList` accordion, before `special_notes` | Matches the existing layout: physical attributes first, then owner / vet, then deworming, then special notes. |

## Why a feature flag at all

The team wanted a low-risk rollout: ship the schema and the inputs, then enable the surface per-nursery once the team has practiced with it. The mechanics mirror `medical_notes`, `vet_management`, etc. — flag controls visibility, the API stays open. This guarantees that if the flag is flipped off after data has been entered, nothing is dropped.

## Alternatives considered

- **A single `last_deworming_date` column.** Rejected — internal/external have different meanings and cadences; collapsing them would force operators to invent conventions like "this date refers to whichever was more recent" that nobody else would know about.
- **A separate `Deworming` model** (one row per treatment, like `Vaccination`). Rejected for now — the feature request was explicitly "one date for each", and the existing data points to operators not caring about the history. Adding the model later is non-destructive (we'd just hide the two columns and read from the new table for the "last date").
- **Make the dates required.** Rejected — every existing pet would need a value, and many pets in the system have never been dewormed at the nursery (e.g. seniors that come straight from a vet program). Nullable-by-default keeps the migration zero-touch and makes the UI's empty state meaningful.

## Data model

```python
class Pet(models.Model):
    # ...existing fields...
    birth_date = models.DateField(null=True, blank=True, ...)
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, ...)
    last_internal_deworming_date = models.DateField(
        null=True, blank=True,
        help_text="Date of the last internal (intestinal) deworming treatment.",
    )
    last_external_deworming_date = models.DateField(
        null=True, blank=True,
        help_text="Date of the last external (flea/tick) deworming treatment.",
    )
```

Migration: `pets/migrations/0013_pet_last_external_deworming_date_and_more.py` (auto-generated).

## Feature-flag entry

```python
{
    'key': 'deworming_tracking',
    'label': 'Deworming tracking',
    'description': (
        'When enabled, the Pet form shows date inputs for the last '
        'internal (intestinal) and external (flea/tick) deworming '
        'treatments, and the Pet detail / list views display them. '
        'Disabled by default — opt in per nursery.'
    ),
    'enabled': False,
}
```

Migration: `feature_flags/migrations/0003_seed_deworming_tracking.py`.

## Files touched

| Layer | Path | Change |
|-------|------|--------|
| Backend | `backend/domain/pets/models.py` | Add two `DateField` columns. |
| Backend | `backend/pets/migrations/0013_*.py` | Auto-generated `AddField` migration. |
| Backend | `backend/feature_flags/migrations/0003_seed_deworming_tracking.py` | New `RunPython` seed for the flag. |
| Backend | `backend/feature_flags/tests.py` | Append `deworming_tracking` to the canonical-flag sets. |
| Backend | `backend/pets/tests/test_pet_api.py` | Tests: default-null, create-with-dates, partial-update sets, partial-update-with-null clears. |
| Backend | `backend/translations/{en,es}.json` | Add `pet.lastInternalDewormingDate`, `pet.lastExternalDewormingDate`, plus the two `…Hint` strings. |
| Frontend | `frontend/src/domain/pets/types.ts` | Extend `Pet` and `PetFormData` with both nullable date fields. |
| Frontend | `frontend/src/components/PetForm.tsx` | Read flag, default the two fields to `null`, render the two date inputs in a `<>` fragment behind the flag. |
| Frontend | `frontend/src/components/PetDetailsPopup.tsx` | Read flag, render a 2-column grid with both dates (or `—`). |
| Frontend | `frontend/src/components/PetList.tsx` | Same flag + 2-column grid in the accordion expanded view, mirroring the popup. |

## Edge cases

- **Toggling the flag off after data exists** — Backend keeps the values, the UI just stops showing them. Toggling the flag back on shows the previously-entered values without any backfill.
- **Future date entered** — No backend validation. The form's native `<input type="date">` lets staff record a treatment that's about to happen; we treat that as user intent rather than enforce a past-only constraint. Could be revisited later.
- **Birth date vs. deworming date inconsistency** — No cross-validation. Realistically operators may not have a birth date but do have a deworming date, and vice versa.
- **Null serialization** — `fields = '__all__'` on the serializer renders missing dates as `null`, which the frontend types model as `string | null`.
