# MODIFIED: Frontend / Schedules

## MODIFIED Requirements

### Requirement: Conflict warning UI SHALL render deduplicated reasons

The conflict-warning UI surfaced by the schedule form (single mode), the multi-mode batch result, and the day-schedule panel SHALL render its rows from the `reason_groups` field of the conflict check response when present. Each row corresponds to one reason and lists every overlapping pet that triggered it. When `reason_groups` is absent (older backend), the UI MAY fall back to the legacy `conflicts[]` array.

The UI SHALL NOT show multiple identical warnings differing only in the overlapping pet's name; that is the entire purpose of the dedup.

#### Scenario: Aggressive pet against three overlapping pets

- GIVEN an aggressive pet is being scheduled
- AND three other pets have overlapping schedules with no other rules firing
- AND the backend returned `reason_groups` with one entry whose `pets` list has three rows
- WHEN the conflict-warning banner renders
- THEN the banner SHALL show ONE row containing the aggressive-pets reason
- AND the row SHALL name all three overlapping pets (e.g. "Milo, Cleo, Nala")

#### Scenario: Two distinct reasons fire

- GIVEN a pet whose new schedule triggers two distinct reasons against the same overlapping pet
- AND the backend returned `reason_groups` with two entries
- WHEN the warning banner renders
- THEN the banner SHALL show TWO rows, one per reason
- AND each row SHALL name the same single overlapping pet

#### Scenario: Backwards-compat fallback

- GIVEN the backend response omits `reason_groups` (older deployment)
- AND the response includes the legacy `conflicts[]` array
- WHEN the warning banner renders
- THEN the banner MAY render one row per `conflicts[]` entry as it did before this change

#### Scenario: Custom-rule reason in the warning

- GIVEN the schedule triggers a persisted custom rule (via `reason_groups`)
- WHEN the warning banner renders
- THEN the banner SHALL display the custom rule's `reason` text verbatim
- AND it SHALL list the affected overlapping pet(s) the same way as for hardcoded rules
