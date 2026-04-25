# Design — Conflict-detection improvements

## Decision summary

| Area | Decision | Why |
|------|----------|-----|
| Custom-rule storage | New `PetIncompatibility(pet1, pet2, reason)` model with order-independent uniqueness | Per-pair is what operators record today (in localStorage); same shape, just persisted. Order-independence prevents `(A,B)` + `(B,A)` from both existing and producing duplicate warnings. |
| Custom-rule scope | Per pet pair, symmetric, free-text reason | Mirrors the existing localStorage shape. Adding directional or breed-pattern rules is out of scope. |
| Custom-rule gating | A rule fires only when the two named pets are scheduled to overlap (same date range + time range), reusing the existing overlap query | Same gating as the 5 hardcoded rules, so the warning UI is consistent. The rule's mere presence in the catalog must not produce a warning by itself. |
| Conflict severity | Stay warnings, don't block | Preserves the existing "schedule always succeeds" contract; switching this would touch every consumer and is a bigger change. |
| New rule 6 | Add as a *new* rule, do not modify rule 2 | Rule 2 ("two highly-dominant pets") still catches the broader case (e.g. cat + dog, both dom>7). Rule 6 ("two same-species same-sex highly-dominant pets") is a stricter, more confident warning — so we want both to fire when both apply, and the de-dup work below collapses the visible noise. |
| Rule 6 threshold | `dominance_level >= 7` (not `> 7` as in rule 2) | Operator's stated requirement. The more confident "same-species same-sex" qualifier justifies the slightly-lower threshold; rule 2 keeps `> 7` so the two rules don't always fire in lockstep. |
| Aggressive-rule de-dup | Group by `reason` on the backend response (`reason_groups` field with `pets[]`) | The operator wants ONE warning per reason. Doing this on the backend keeps the UI rendering trivial and means the same dedup applies to the existing single-mode banner, the multi-mode batch result, and the calendar/day-schedule overlap UIs in one place. |
| Backwards-compat for `conflicts[]` | Keep the old field for one release, add `reason_groups` alongside | Lets the frontend land independently without breaking external API consumers (we have at least one — the OpenAPI schema is published). |
| Settings UI migration | No automated localStorage → backend migration | localStorage is per-browser; we can't reliably aggregate it. Accept the cost (operators re-enter their rules) in exchange for a clean cut. We'll show a one-time banner: "Rules were stored only in this browser before — re-enter any you still need." |
| Permissions on custom rules | Same as schedules: any authenticated user (admin or staff) can manage | Conservative; matches the rest of the model. Could be tightened later. |

## Why a new backend model and not just an API on the existing settings

Today the rules live in `localStorage`, conceptually anchored to the same JSON-y settings-list shape (open-ended array, no FK integrity). Moving them to a real model gives us:

- **Referential integrity** via `pet1`/`pet2` FKs to `pets.Pet` with `on_delete=CASCADE` — when a pet is deleted, its custom incompatibility rules go too.
- **Querability**: the conflict-check query can join on `pet1_id` / `pet2_id` directly instead of scanning a JSON blob.
- **Per-row update / delete** without rewriting the whole list.
- **OpenAPI documentation** through drf-spectacular, same as every other model.

## Order-independent uniqueness

A custom rule between Luna (id=5) and Milo (id=8) should be the **same row** as one between Milo and Luna. Two ways to enforce that:

1. **Application-level normalisation** — sort `(pet1_id, pet2_id)` so `pet1_id < pet2_id` always, then `unique_together = ('pet1', 'pet2')`.
2. **Constraint expression** — `UniqueConstraint(LEAST(pet1, pet2), GREATEST(pet1, pet2))`.

Going with option 1: simpler, portable across PostgreSQL and SQLite (the test runner uses an in-memory SQLite), and we can enforce normalisation in `clean()` / serializer `validate()`. The query that asks "does a custom rule exist between A and B?" then becomes:

```python
PetIncompatibility.objects.filter(
    pet1_id=min(a, b),
    pet2_id=max(a, b),
).first()
```

## API shape change for `/api/schedules/check_conflicts/`

**Today (kept for backwards-compat):**
```json
{
  "has_conflicts": true,
  "conflicts": [
    {"conflicting_pet": "Milo", "reason": "Aggressive pets...", "reasons": [...], "time_slot": "...", "date_range": "..."},
    {"conflicting_pet": "Cleo", "reason": "Aggressive pets...", "reasons": [...], "time_slot": "...", "date_range": "..."},
    {"conflicting_pet": "Nala", "reason": "Aggressive pets...", "reasons": [...], "time_slot": "...", "date_range": "..."}
  ],
  "overlapping_pets_count": 3
}
```

**New (added alongside, frontend prefers this):**
```json
{
  "has_conflicts": true,
  "conflicts": [...],          // unchanged, deprecated
  "reason_groups": [
    {
      "reason": "Aggressive pets cannot be scheduled together with other pets",
      "pets": [
        {"id": 8, "name": "Milo", "time_slot": "09:00-17:00", "date_range": "..."},
        {"id": 6, "name": "Cleo", "time_slot": "09:00-17:00", "date_range": "..."},
        {"id": 11, "name": "Nala", "time_slot": "09:00-17:00", "date_range": "..."}
      ]
    }
  ],
  "overlapping_pets_count": 3
}
```

The frontend UI then renders one row per reason: *"Aggressive pets cannot be scheduled together with other pets — Milo, Cleo, Nala"*. When multiple reasons fire (e.g., aggressive + same-species-same-sex), they're separate rows.

## Edge cases

- **Custom rule between A and A.** Reject in serializer validation — a pet can't be incompatible with itself.
- **Custom rule with deleted pets.** CASCADE: rule disappears with either pet.
- **Custom rule + hardcoded rule firing for the same pair.** Both reasons go into the response. The dedup is per-reason, so two distinct reasons remain two distinct warnings — that's the intended UX.
- **Reason text containing a quote / newline.** Free-text, no validation; the response is JSON-encoded so escaping is automatic.
- **Many overlapping pets (say, 50 in a single day).** The `pets[]` list scales linearly; a 50-pet day is unusual but not pathological. UI may want to render the first N + "and X more" — flagged for the frontend implementation but not specced.

## Files touched (planned)

| Layer | Path | Change |
|-------|------|--------|
| Backend | `backend/domain/pets/models.py` | Add `PetIncompatibility` model + new rule 6 in `Pet.is_compatible_with` |
| Backend | `backend/pets/migrations/0014_*.py` | Auto-generated migration for the new model |
| Backend | `backend/pets/serializers.py` | New `PetIncompatibilitySerializer` |
| Backend | `backend/pets/views.py` | New `PetIncompatibilityViewSet`; collation in `check_conflicts` |
| Backend | `backend/pets/urls.py` | Wire the new viewset |
| Backend | `backend/pets/tests/test_pet_incompatibility_api.py` | CRUD + integration tests |
| Backend | `backend/pets/tests/test_pet_api.py` | New rule 6 unit test + custom-rule integration test |
| Backend | `backend/translations/{en,es}.json` | New reason string for rule 6 |
| Frontend | `frontend/src/domain/pet-incompatibilities/{api,types}.ts` | New domain folder for the API |
| Frontend | `frontend/src/lib/api.ts` | Re-export the new API |
| Frontend | `frontend/src/app/settings/page.tsx` | Switch to the new API; drop localStorage |
| Frontend | `frontend/src/components/ScheduleForm.tsx` | Render off `reason_groups` (fallback to `conflicts`) |
| Frontend | `frontend/src/components/DaySchedule.tsx` | Same dedup rendering |
| Frontend | `frontend/tests/...` | Settings-page persistence test, conflict-banner dedup test |
| Specs | `openspec/changes/conflict-detection-improvements/specs/...` | Deltas (this change folder) |

## Implementation phases (suggested)

1. **Backend model + API + tests** — purely additive, no UI consumers yet.
2. **Backend rule 6** — trivial.
3. **Backend collation** — adds `reason_groups`, keeps `conflicts`.
4. **Frontend Settings switch-over** — uses the new API, drops localStorage.
5. **Frontend warning dedup** — uses `reason_groups`, falls back to `conflicts`.
6. **Translations + spec deltas** — rolling.
7. **Archive commit** on the feature branch (per the workflow rule).
