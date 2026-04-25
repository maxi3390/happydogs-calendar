# MODIFIED: Backend / Schedules

## ADDED Requirements

### Requirement: `check_conflicts` response SHALL include a `reason_groups` collation

The response from `POST /api/schedules/check_conflicts/` (and the embedded `warnings` field on the create response) SHALL expose a new `reason_groups` field alongside the existing `conflicts` array. Each entry in `reason_groups` SHALL have:

```
{
  "reason": "<the reason text>",
  "pets": [
    { "id": <int>, "name": "<str>", "time_slot": "<HH:MM-HH:MM>", "date_range": "<str>" }
  ]
}
```

A reason that fires across multiple overlapping pets SHALL appear as a SINGLE `reason_groups` entry whose `pets` list contains every affected overlapping pet, instead of one row per pet.

When two or more distinct reasons fire for the same overlapping pet, each reason SHALL be a separate `reason_groups` entry.

The existing `conflicts` array SHALL continue to be emitted for backwards compatibility and SHALL be marked deprecated in the OpenAPI schema. Frontend consumers SHALL prefer `reason_groups` when present.

#### Scenario: One reason across many overlaps collapses

- GIVEN an aggressive pet is being scheduled
- AND three other pets have overlapping schedules
- WHEN the conflict check runs
- THEN `reason_groups` SHALL contain exactly one entry with `reason = "Aggressive pets cannot be scheduled together with other pets"`
- AND that entry's `pets` list SHALL contain three rows, one per overlapping pet
- AND `overlapping_pets_count` SHALL be `3`

#### Scenario: Two distinct reasons stay separate

- GIVEN a pet that triggers BOTH the aggressive rule AND the new rule 6 (same species + same sex + dominance ≥ 7) against the same single overlapping pet
- WHEN the conflict check runs
- THEN `reason_groups` SHALL contain TWO entries — one per reason
- AND each entry's `pets` list SHALL contain the single overlapping pet

#### Scenario: No conflicts

- GIVEN a pet that triggers no rules against any overlap
- WHEN the conflict check runs
- THEN `reason_groups` SHALL be an empty array
- AND `has_conflicts` SHALL be `false`

#### Scenario: Custom-rule reason in `reason_groups`

- GIVEN a persisted `PetIncompatibility` rule between pets A and B with `reason = "Vet advised separation"`
- AND pets A and B have overlapping schedules
- WHEN the conflict check runs for pet A
- THEN `reason_groups` SHALL contain an entry with `reason = "Vet advised separation"` and `pets = [{ B's projection }]`

### Requirement: Custom rules SHALL be gated by overlap

A persisted `PetIncompatibility` rule SHALL surface a warning ONLY when both pets it names actually overlap on the schedule being checked (same overlap criteria as the hardcoded rules: date range overlap AND time range overlap, and the other schedule's status is `scheduled` or `checked_in`). The mere existence of a rule in the catalog without an actual overlap SHALL NOT produce a warning.

#### Scenario: Catalog-only custom rule with no overlap is silent

- GIVEN a persisted custom rule between pets A and B
- AND pet B has NO schedule overlapping with the new schedule for pet A
- WHEN the conflict check runs for pet A
- THEN `has_conflicts` SHALL be `false`
- AND `reason_groups` SHALL NOT contain the custom rule's reason

#### Scenario: Custom rule with an overlap fires

- GIVEN a persisted custom rule between pets A and B
- AND pet B has a schedule that overlaps with the new schedule for pet A (same date range + time range, status active)
- WHEN the conflict check runs for pet A
- THEN `reason_groups` SHALL contain the custom rule's reason
- AND that entry's `pets` SHALL include pet B
