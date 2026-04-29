# Seed: overlapping multi-day stays, split shifts, and operator-override conflicts

## Why

`seed_example_data` ships a hand-tuned demo dataset that's referenced in docs, screenshots, and tests. It currently exercises the basic happy paths — single-day schedules across four statuses, two pets on the same day in separate slots — but leaves several real surfaces untested in the demo:

1. **Every schedule is single-day.** The `multiday_schedule` feature flag (default on) gates the multi-day input on `ScheduleForm`, but a fresh seed never produces a row that exercises the multi-day calendar bar. Engineers debugging the multi-day rendering have to hand-craft a row first.
2. **No same-pet split shifts.** A pet with a morning visit + afternoon visit on the same day is a common operator workflow and a distinct calendar cell shape, but the seed has no example.
3. **No conflicts ever fire.** The schedule fixture sets up Bruno (aggressive) alone on his day, and a Toby/Copito overlap that's actually compatible under the rules. `Pet.is_compatible_with` returns `True` for every overlap in the seed, so the conflict-warning UI is dead-code from the demo's perspective. The "compatibility_warnings" feature flag toggles a surface that the demo never lights up.
4. **`PetIncompatibility` is never seeded.** Custom per-pair rules are a real product feature with a dedicated form, but the demo dataset has zero examples — engineers debugging the custom-reason rendering have to hand-add rows.
5. **`NurserySetting.daily_booking_limit` stays at 0** (unlimited), so the daily-limit pill on the calendar never renders against the seeded data.

## What

1. **Schedule fixture grows from 10 to 17 rows**. The 7 additions cover the gaps above:
   - Split shift: Mía has morning + afternoon visits on `today`.
   - Compatible multi-day overlap: Diego's Kiki (4-day stay) with Perico (2-day stay nested inside Kiki's window).
   - Multi-day + operator-override conflict: Bruno's 3-day stay overlapping Toby on day 22 — triggers compatibility rule 1 (aggressive). The `notes` on both rows describe the operator's physical-separation mitigation.
   - Custom-rule overlap: Pedro's two cats Milo + Cleo at the same time on day +5; the matching `PetIncompatibility` row carries the free-text reason.
2. **New `SEED_PET_INCOMPATIBILITIES` constant + `_seed_pet_incompatibilities` method**. Seeds one custom rule (Milo ↔ Cleo) under the canonical (lo_id, hi_id) ordering. `--reset` walks both FK columns to clean up.
3. **New `SEED_NURSERY_SETTINGS` constant + `_seed_nursery_setting` method**. Sets `daily_booking_limit = 6` on the singleton; reconciles the seed-owned subset on every run, leaves all other singleton fields alone.
4. **Live spec extended**: schedule count bumped (10 → 17), natural-keys list extended, two new Requirements (schedule shapes catalogue + nursery-singleton handling), explicit scenarios for split shift / overlap pair / multi-day override / custom-rule conflict / non-seed-field preservation.
5. **12 new backend tests** (`pets/tests/test_seed_example_data.py`) split across three new TestCase classes:
   - `SeedExampleDataScheduleScenariosTests` (5) — pins each schedule shape.
   - `SeedExampleDataPetIncompatibilityTests` (4) — count, pet pair, idempotency, --reset round-trip.
   - `SeedExampleDataNurserySettingsTests` (3) — initial value, drift recovery, non-seed-field preservation.
6. **`_print_summary` extended** with two new lines (`pet incompat.`, `nursery settings`) so operators see the new entities reflected in the seed report.

## Impact

- **Schedule row count** in any test or doc that hardcodes "10 schedules" needs updating. The existing tests use `len(seed_module._seed_schedules())` (auto-derived) so they adapt; the spec's exact-count scenario was edited in place.
- **No new database migrations** — `PetIncompatibility` and `NurserySetting` already exist in the schema; the seed just populates them.
- **Idempotency preserved**: the new entities use `get_or_create` (incompatibility) and value-reconciling reads (singleton). A second `make seed-example-data` reports zero `created=` lines on the new rows, matching the existing contract.
- **`--reset` cleans up the new entities**: incompatibility rows are deleted before the pets they reference (Django would cascade anyway, but the explicit count surfaces in the summary). The singleton is not deleted (it can't be — `pk=1` is enforced) but its seed-owned fields get re-applied on the subsequent seed phase.
- **Live spec**: `tooling/seed/spec.md` is the only canonical surface that changes.

## Out of scope

- **Documents (`Document` model)**. Adding seed documents requires real file fixtures committed to the repo, which is heavyweight for a deterministic demo. Skip for now; revisit if the document-upload UI needs visual coverage in the seed.
- **Vet incompatibility rules** at the species level. The current `PetIncompatibility` is per-pet-pair; species-level rules are a separate (future) feature.
- **Touching unrelated singleton fields** (notification times, deworming cadence). Out of scope; the seed only manages `daily_booking_limit` to keep the operator-customisation surface clear.
- **Frontend changes**. None needed — the calendar / schedule form / settings page already render every shape the seed now produces. The Playwright suite is unaffected (e2e tests stub their own fixtures).
