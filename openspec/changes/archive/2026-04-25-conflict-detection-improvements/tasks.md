# Tasks — Conflict-detection improvements

## Phase 1 — Backend: persist custom incompatibility rules

- [x] Add `PetIncompatibility(pet1, pet2, reason)` model in `backend/domain/pets/models.py` with order-independent uniqueness (normalised `pet1_id < pet2_id`).
- [x] Generate `pets/migrations/0014_pet_incompatibility.py`.
- [x] Add `PetIncompatibilitySerializer` with self-pair validation (`pet1 != pet2`).
- [x] Add `PetIncompatibilityViewSet` exposing list / create / update / delete under `/api/pet-incompatibilities/`.
- [x] Wire the viewset into `backend/pets/urls.py`.
- [x] Write tests in `backend/pets/tests/test_pet_incompatibility_api.py`: CRUD, order-independent uniqueness, self-pair rejection, cascade-on-pet-delete.

## Phase 2 — Backend: integrate custom rules into compatibility check

- [x] Update `Pet.is_compatible_with(other)` to query `PetIncompatibility` for `(min, max)` of `(self.id, other.id)` and append the rule's `reason` to the returned list.
- [x] Add a unit test in `backend/pets/tests/test_pet_api.py` that creates a custom rule and asserts a fresh schedule between the two pets returns a warning containing the custom reason.

## Phase 3 — Backend: new rule 6 (same species + same sex + dom ≥ 7)

- [x] Add rule 6 to `Pet.is_compatible_with` after rule 5 (preserves existing rule numbering).
- [x] Add a unit test that two same-species same-sex pets with `dom = 7` each trigger rule 6 (and rule 2 doesn't, since rule 2 requires `> 7`).

## Phase 4 — Backend: dedup conflict reasons in the API response

- [x] Add a `reason_groups` field to the `check_conflicts` response. Each entry: `{ reason: str, pets: [{ id, name, time_slot, date_range }] }`.
- [x] Keep the existing `conflicts[]` list for backwards compatibility (mark deprecated in the OpenAPI doc).
- [x] Test: an aggressive pet overlapping with three other pets returns ONE entry in `reason_groups` with three pets in its list.
- [x] Test: when two distinct reasons fire (e.g. aggressive + same-species-same-sex), `reason_groups` has two entries.

## Phase 5 — Frontend: switch Settings UI to backend-persisted rules

- [x] New domain folder `frontend/src/domain/pet-incompatibilities/{api.ts,types.ts}`.
- [x] Re-export the API in `frontend/src/lib/api.ts`.
- [x] In `frontend/src/app/settings/page.tsx`: replace the localStorage read/write with the new API; drop the `pet_incompatibilities` localStorage key entirely.
- [x] Show a one-time hint banner on the Settings page: "Custom incompatibility rules are now stored centrally — any local rules from before will need to be re-entered."
- [x] Update / remove the existing settings-page tests if they assert localStorage behavior.

## Phase 6 — Frontend: render deduped warnings

- [x] In `ScheduleForm.tsx` (single mode), render the conflict banner from `reason_groups` (one row per reason, listing all affected pets), falling back to `conflicts[]` when `reason_groups` is missing (older backend).
- [x] Same change in the multi-mode batch result screen.
- [x] Same change in `DaySchedule.tsx`.
- [x] Add Playwright tests covering: aggressive pet → one warning row → multiple pets listed.

## Phase 7 — Translations

- [x] Add EN/ES strings for rule 6.
- [x] Update any UI copy that referenced "per overlapping pet" if necessary.

## Phase 8 — Spec deltas (OpenSpec)

- [x] `specs/backend/pets/spec.md`: new `PetIncompatibility` model requirement, rule 6 added to compatibility checking, custom rules consulted by `is_compatible_with`.
- [x] `specs/backend/schedules/spec.md`: new `reason_groups` field on `check_conflicts` response, dedup semantics.
- [x] `specs/frontend/settings/spec.md`: rules now persisted server-side; localStorage path removed.
- [x] `specs/frontend/schedules/spec.md`: deduped warning rendering.

## Phase 9 — Archive (on this feature branch, before merge)

- [x] Move `openspec/changes/conflict-detection-improvements/` → `openspec/changes/archive/<YYYY-MM-DD>-conflict-detection-improvements/`.
- [x] Merge each delta into the corresponding live spec under `openspec/specs/...`.
- [x] Single `chore(archive): ...` commit on the feature branch.

## Verification

- [x] Backend tests green (`make test-backend`).
- [x] Frontend typecheck clean.
- [x] Frontend tests green for the touched suites (settings, schedule, calendar).
- [x] Manual smoke: create a custom rule in Settings, schedule two pets that should fire it, see one deduped warning entry naming both pets.
