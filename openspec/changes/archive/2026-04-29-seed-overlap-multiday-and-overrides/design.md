# Design — Seed: overlapping multi-day stays + override conflicts

## Why these specific shapes

The schedule fixture previously fell into a "happy path only" pattern. Every overlap was compatible; every stay was single-day. The demo dataset is the first impression engineers get of the system's behaviour, and a "happy path only" demo is dishonest about a product where conflict warnings, multi-day stays, and operator overrides are real concerns.

The seven new schedule rows are picked so each lights up exactly one (or two) calendar cell shapes that previously weren't reachable from a fresh seed. The list isn't exhaustive — we deliberately stopped at the shapes the calendar already renders, rather than padding the seed with edge cases that exist only as test fixtures.

| Shape                                  | Seeded by             | Why this pet/pair                                        |
|----------------------------------------|-----------------------|----------------------------------------------------------|
| Same-day split shift                   | Mía morning+afternoon | Mía already has a `today` row; one extra schedule = the simplest cell shape covered. |
| Compatible multi-day overlap           | Kiki + Perico         | Different species, both calm/friendly — passes every rule, so the demo has a clean multi-day overlap that ISN'T flagged. Demonstrates the rendering without confusing the lesson with a warning. |
| Multi-day + operator override (built-in rule) | Bruno + Toby   | Bruno is the seed's only aggressive pet (rule 1 trigger). Stacking him against Toby's single-day visit shows the override pattern AND the multi-day shape in one fixture. |
| Custom-rule operator override          | Milo + Cleo           | Same-owner cats — the most plausible "I know they don't get along" scenario for nursery staff. |

## Default for `daily_booking_limit`: 6

The seed has 17 schedule rows total. The busiest single day under the new fixture is `today + 7` (Luna + Bugs at the same slot, plus Mía's morning + afternoon if today happens to fall on a `today + 7` from another seed run). At a limit of 6, the calendar's daily-limit pill SHALL stay quiet on the typical day but will fire if the operator clicks around adding more. That's the goal: light up the affordance without immediately alarming a fresh demo.

A limit of 0 (current default) means the affordance never fires; a limit of 1 is unrealistically low for a nursery. 6 lands in the believable "small operation" range and matches the rough order-of-magnitude of the seed's busiest day.

## Why `_seed_nursery_setting` reconciles only seed-owned fields

The singleton has nine fields; the seed manages exactly one (`daily_booking_limit`). If the seed re-applied every default on every run, an operator who customised `notifications_run_time` to 8am would see it reset to 7am every reseed — a hostile pattern.

The seed's contract for the singleton is: "I own `daily_booking_limit`. Everything else is yours." The `_seed_nursery_setting` method walks `SEED_NURSERY_SETTINGS` and reconciles each key, never touching anything outside that dict. This is the same pattern other entities use (e.g. `_seed_owners` only reconciles fields named in the SEED_OWNERS payload), just adapted for a singleton without a natural key.

## Why `--reset` doesn't delete the singleton

`NurserySetting` is enforced as `pk=1` in `save()`. Deleting + recreating it would change nothing observable — the new row would have the same pk and the operator's non-seed customisations would survive only if we re-applied them, which the seed deliberately does not do. The cleaner pattern is "reset just runs the normal `_seed_nursery_setting`, which restores `daily_booking_limit` to canonical and leaves every other field alone".

If a future flag is added to seed more fields, the same machinery handles it without code changes — extend `SEED_NURSERY_SETTINGS` and the reconciliation loop picks it up.

## Why `PetIncompatibility` rows are explicitly counted in `_reset`

Cascading deletion via the Pet FK would clean these up automatically. The explicit count exists so the per-entity `deleted=` line in the seed summary is attributable — operators reading the output can see "1 pet incompatibility rule was removed" rather than having to mentally infer it from the cascade. Same pattern Schedule and Vaccination already follow.

The filter uses a `Q(pet1_id__in=...) | Q(pet2_id__in=...)` because the model stores rows order-independently. Filtering only on `pet1_id` would miss any rule where the seed pet happens to be the higher of the two ids.

## Why we didn't add Documents

`Document` ships with the model `pets.Document` and is uploaded as a file. Seeding documents would require either:

- Bundling sample binary files in the repo (bloats the repo; deterministic across resets means the same bytes every time, which is wasteful version control).
- Generating documents on the fly (breaks the "no random generators" rule from the spec).

Neither pays off for a demo seed. If the document-upload UI ever needs visual coverage from the seed, that's a separate change that justifies a `seed_assets/` directory with a 1-byte placeholder PDF or similar.

## Conflict reasons we trigger

The override pair is staged so `Pet.is_compatible_with` returns at least one reason:

| Pair         | Triggered rule | Why |
|--------------|----------------|-----|
| Bruno + Toby | Rule 1 (aggressive) | Bruno's `temperament == 'aggressive'` is sufficient. |
| Milo + Cleo  | Custom rule    | The seeded `PetIncompatibility` row's free-text reason is appended verbatim. |

We could push Bruno + Toby through additional rules (e.g. by tweaking dominance), but each rule introduces extra coupling between the seed and the rule's threshold. Keeping it to just rule 1 means the test asserts the *minimum* — "at least the aggressive reason fires" — and a future rule edit doesn't accidentally break the seed test.

## Why the new tests don't assert exact PKs

`test_reset_recreates_rules` looks up the recreated rule by pet pair, not by PK. The reason is that `--reset` deletes + re-creates the row, so any reference held by the Python test (e.g. `rule = PetIncompatibility.objects.first()`) becomes stale. Looking up by `(lo, hi)` mirrors how the seed code itself finds the rule and is robust to PK churn across `--reset` cycles. Same pattern would apply to any future entity-pair-keyed seed test.
