# Conflict-detection improvements

## Why

Four issues with the current conflict-detection system, surfaced by operators:

1. **Custom incompatibility rules are silently disconnected.** The Settings page lets staff record per-pet-pair incompatibilities, but those rules are stored in the browser's `localStorage` and never reach the backend. The conflict-check API uses only the 5 hardcoded rules. Operators think they're configuring conflict detection but nothing actually changes.

2. **A common real-world conflict is not flagged**: two pets of the **same species and same sex with dominance ≥ 7**. Today rule 2 only fires when *both* pets have dominance > 7 (no species/sex constraint). The same-species-same-sex case is a much higher-confidence warning that operators want highlighted explicitly — think two intact male alpha dogs.

3. **The aggressive-pet warning duplicates per overlap.** When an aggressive pet shares a day with 4 other pets, the conflict UI shows "Aggressive pets cannot be scheduled together with other pets" 4 times, once per overlapping pet. The information is the same; the repetition is just noise.

4. **(folded into 1)** Once custom rules are persisted on the backend, they should fire **only when both rule pets are actually overlapping at the same time** — same gating as the hardcoded rules — not just because the rule exists in the catalog.

## What

A single coherent improvement to the conflict-detection system covering all four points:

1. **Persist custom incompatibility rules backend-wise.** Move the per-pet-pair rule from `localStorage` into a backend model (`PetIncompatibility`), expose a CRUD API, and have `Pet.is_compatible_with(other)` consult both the 5 hardcoded rules AND any persisted custom rule between `self` and `other`.
2. **Add a 6th hardcoded rule**: same species + same sex + both dominance ≥ 7 → "Two same-species same-sex highly-dominant pets". Independent of rule 2 (which keeps catching the broader "two highly-dominant pets" case).
3. **Custom rules are gated by overlap.** A custom rule produces a warning only when the two pets it names are scheduled to overlap (same day + overlapping time range), reusing the same overlap query the hardcoded rules already use.
4. **De-duplicate the aggressive-pet warning.** When the same reason fires across multiple overlapping pets, surface it **once** with a list of the affected pets rather than once per pet. Generalises naturally to other reasons that may collide in the same way (e.g., the new same-species-same-sex rule).

## Scope (in)

- **Backend**:
  - New model `PetIncompatibility(pet1, pet2, reason)` with a uniqueness constraint that's order-independent (i.e. `(A,B)` and `(B,A)` are the same row).
  - New REST endpoints under `/api/pet-incompatibilities/` (list/create/update/delete).
  - `Pet.is_compatible_with(other)` consults the persisted custom rules.
  - `ScheduleViewSet.check_conflicts` collation: instead of one row per `(reason × overlapping_pet)`, return one entry per `reason` with a `pets[]` list of the affected overlapping pets.
  - Migration adding the new model + a data migration that seeds the table from any existing `nursery_settings.NurserySetting`-side state if there's a sensible source (likely empty — staff localStorage can't be migrated server-side).
  - New rule 6 in `Pet.is_compatible_with`.
- **Frontend**:
  - Settings page reads/writes via the new API instead of `localStorage`. Drop the `localStorage` storage path entirely (no migration UX — staff re-enter rules via the new UI; we'll communicate this).
  - Conflict-warning UI in `ScheduleForm` (single + multi modes) renders one entry per reason, listing all affected pets together.
  - Translations for the new rule 6 reason and any UI copy changes.
- **Specs**:
  - Delta updates to `specs/backend/pets/spec.md` (new model, new rule, custom-rule integration into `is_compatible_with`).
  - Delta to `specs/backend/schedules/spec.md` (new collation contract on the `check_conflicts` response).
  - Delta to `specs/frontend/settings/spec.md` (custom rules now persisted server-side).
  - Delta to `specs/frontend/schedules/spec.md` (deduped warning UI).

## Scope (out)

- Making conflicts blocking. They stay non-blocking warnings (preserves the existing "schedule always succeeds" contract).
- Importing existing localStorage rules — those values live only in operators' browsers; we'll surface a one-time UI hint that previously-saved local rules need to be re-entered, but no automated migration.
- Daily-limit changes (separate concern).
- Multi-pet pre-check vs post-check (separate concern; the dedup change still applies to the post-create warnings shown there).
- Per-rule severity levels, time-of-day separation, muzzle/supervised-play modifiers — flagged in earlier exploration but not in this change.
- Audit trail / "override anyway" tracking — separate concern.

## Approach

1. **Backend first**: model + migration + serializer + viewset + integration into `Pet.is_compatible_with` + tests.
2. **Backend collation**: change `ScheduleViewSet.check_conflicts` response shape (add a `reason_groups` field that buckets overlapping pets by reason) without breaking the existing `conflicts` array (deprecate but keep). Add tests for the new shape.
3. **New rule 6**: trivial addition to `is_compatible_with`, plus a test.
4. **Frontend Settings**: switch to the new API; drop localStorage persistence.
5. **Frontend ScheduleForm + DaySchedule**: render off the new `reason_groups` field; fall back to `conflicts` if the backend is older.
6. **Translations** for rule 6 and any UI copy.
7. **Specs**: delta files in this change folder.
8. **Archive on the feature branch**: per the project's OpenSpec workflow, the archive step (move the change folder + merge delta into live spec) lands as the final commit on this feature branch before the merge to master.
