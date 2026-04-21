# Proposal — feature-flags

## Intent

Introduce a centralised feature-flag system so operators can turn specific product surfaces on and off without a code deploy, and so engineers can ship half-built features behind a flag. The system ships with six initial flags that gate existing or about-to-exist UI, proving the plumbing works end-to-end.

## Scope

### In scope

- A new `feature_flags` Django app with a single `FeatureFlag(key UNIQUE, label, description, enabled, updated_at)` model. No per-user targeting, no environment variants, no percentage rollouts — global booleans are enough for this product.
- A data migration that seeds the canonical set of flags so a fresh install already has every known key at its intended default. Re-running `migrate` is a no-op (`get_or_create` by key).
- A `feature_flags.services.is_feature_enabled(key)` helper for backend code that needs to gate branches.
- REST surface under `/api/feature-flags/`:
  - `GET /api/feature-flags/` — any authenticated user sees the full set.
  - `PATCH /api/feature-flags/<key>/` — admin-only; toggles `enabled`.
- A frontend `FeatureFlagsProvider` that fetches `/api/feature-flags/` on auth and exposes a `useFeatureFlag(key: string) → boolean` hook. Falls back to `false` while loading and on fetch error.
- An admin-only page at `/admin/feature-flags` where an admin can flip each flag and see its human-readable label and description.
- Wiring for six initial flags — each one **actually** gates something, not just a dead registry entry:

| Flag                       | Default | Effect when off                                                                |
|----------------------------|---------|--------------------------------------------------------------------------------|
| `multiday_schedule`        | on      | `ScheduleForm` hides the end-date input and forces `end_date == start_date`.   |
| `custom_pet_species`       | off     | No effect. When on, `PetForm` renders a free-text species input alongside the hard-coded dropdown so a nursery can record exotic species without code changes. |
| `vet_management`           | on      | The `/vets` nav link disappears, owner-form primary/emergency vet dropdowns are hidden, pet-form `vet_override` is hidden. The backend endpoints stay up so existing FKs aren't corrupted. |
| `medical_notes`            | on      | The medical-notes section of `PetForm` is hidden.                              |
| `data_backup`              | on      | The Data Backup card in `/settings` is hidden.                                 |
| `compatibility_warnings`   | on      | The post-schedule-create conflict warning banner is suppressed.                |

### Out of scope

- Per-user or per-role flags. When we need that, we'll extend the model (e.g. `audience` CharField with `all`/`admin`/`beta`). For now every flag applies globally.
- Server-side gating of writes. The flags are UI toggles — the backend endpoints behind each flagged feature stay reachable so existing data (e.g. Vet FKs when `vet_management` is off) isn't corrupted by missing rows. The semantic contract is "we stop showing this section," not "we break it."
- Audit trail of who toggled what and when. The `updated_at` field tells us last-changed; the operator who flipped a flag isn't recorded. If that becomes important, we'll add a `ChangeLog` sibling model.
- A `custom_pet_species` "species manager" UI where the operator maintains a list of allowed species. That's a real follow-up; for this change the flag unlocks a free-text override in the pet form and nothing else.
- A CLI `manage.py feature_flag <key> on/off` command. The admin page is enough; if an operator is locked out of the UI they can use the Django admin.

## Approach

1. Start a clean `backend/feature_flags/` Django app. Put the model, serializer, viewset, URLs, service helper, and tests there. Register in `INSTALLED_APPS` and `nursery/urls.py`.
2. Initial flags live in a data migration rather than a Python constant so adding a flag in a future change is a migration (which is how we version every other persisted invariant).
3. Frontend:
   - New `frontend/src/domain/feature-flags/` module (types + api client).
   - New `frontend/src/lib/feature-flags.tsx` providing `FeatureFlagsProvider` and `useFeatureFlag(key)`. The provider defers its fetch until the auth token is known so unauthenticated pages don't make a pointless request.
   - Wrap `app/layout.tsx` inside the existing provider stack.
   - Admin page `app/admin/feature-flags/page.tsx` using the existing `withAdmin` HOC.
4. Gating: apply the feature-flag hook at each UI call site listed in the table above. Keep the gates at the rendering layer — the data, types, and API stay intact.
