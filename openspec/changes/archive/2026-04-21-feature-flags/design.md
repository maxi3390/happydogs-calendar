# Design — feature-flags

## Model

```python
class FeatureFlag(models.Model):
    key = models.SlugField(max_length=64, unique=True)
    label = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['key']
```

`key` is the stable machine-facing identifier (snake_case slug). `label` and `description` are operator-facing copy surfaced on the admin page. `enabled` is the toggle state; `updated_at` answers "when did this last change". No `created_at` because flags are seeded by a migration, so creation time is deployment time — not useful.

## Seed migration

A data migration (`0002_seed_flags.py`) runs `get_or_create(key=...)` per flag. Adding a flag in a future change is a new data migration. Re-running `migrate` never duplicates rows (idempotent), and reversing the migration is a no-op — we don't auto-delete flags because that would silently flip a feature off.

Initial seed (all six):

| key                       | enabled | label                   |
|---------------------------|---------|-------------------------|
| `multiday_schedule`       | True    | Multi-day schedule      |
| `custom_pet_species`      | False   | Custom pet species      |
| `vet_management`          | True    | Vet management          |
| `medical_notes`           | True    | Medical notes           |
| `data_backup`             | True    | Data backup             |
| `compatibility_warnings`  | True    | Compatibility warnings  |

Descriptions live in the migration too (same place as the key) so the admin UI never has to hard-code copy.

## Service helper

```python
# feature_flags/services.py
def is_feature_enabled(key: str) -> bool:
    return FeatureFlag.objects.filter(key=key, enabled=True).exists()
```

Single DB hit per call. If this becomes a hot path we can memoize with `functools.lru_cache` and a signal-driven invalidator, but this app's scale doesn't warrant that yet.

## Permissions

- `GET /api/feature-flags/` — `IsAuthenticated`. Every user needs to know which UI sections to show, so everyone can read.
- `PATCH /api/feature-flags/<key>/` — `IsAdminUser`. Only admins can toggle. Anyone else gets 403.

Lookup by `key` (not `id`) for a stable URL that survives migrations.

## Frontend provider

```
AuthProvider
  └── TranslationProvider
        └── FeatureFlagsProvider          ← new
              └── ToastProvider
                    └── children
```

The provider:

1. Subscribes to the auth state.
2. When the token appears, fetches `/api/feature-flags/` once. Stores the result as a `Record<string, boolean>`.
3. Exposes `useFeatureFlag(key)` which returns `flags[key] ?? false` (fail-closed).
4. Exposes `useFeatureFlags()` which returns the full map (for the admin page's listing).
5. Refreshes the map optimistically after a successful `PATCH` from the admin page.

Fail-closed means a new flag defaults to "off" on the frontend until the fetch completes or if the server is unreachable — this prevents a flaky network from leaking an in-development feature. The backend seed ensures every known flag has a deterministic default on a healthy install.

## Admin page

Path: `/admin/feature-flags`, guarded by the existing `withAdmin` HOC. Renders one row per flag with:

- `label` (bold) and `key` (monospace, muted).
- `description` beneath, word-wrapped.
- A toggle switch (enabled / disabled) with an optimistic UI: click → patch → refresh map.

No create / delete — flags are added via code (migrations), not by operators.

## Wiring points

For each flag, the exact frontend gate:

- `multiday_schedule` → `ScheduleForm.tsx`: when off, hide the "end_date" `<input>` and force `setFormData({ ..., end_date: formData.start_date })` on every `start_date` change. `MultiPetScheduleForm` already shares the same component, so gating lives in one place.
- `custom_pet_species` → `PetForm.tsx`: when on, render an extra `<Input label="Custom species">` that, if non-empty, overrides the dropdown value in the submitted payload. When off, only the dropdown is rendered and the input is absent.
- `vet_management` → `Navigation.tsx` (profile menu entry), `OwnerForm.tsx` (veterinary section), `PetForm.tsx` (vet override dropdown). All three gates key off the same hook call.
- `medical_notes` → `PetForm.tsx`: the `{pet && ( ... MedicalNotesSection ... )}` block becomes `{pet && flag && ( ... )}`.
- `data_backup` → `SettingsPage` — wrap the `<DataBackupSection />` render in a flag check.
- `compatibility_warnings` → `ScheduleForm.tsx` post-save result view: conflict list banner is hidden when the flag is off.

Every gate is a simple conditional around the JSX. No changes to the API shape, no changes to the types.

## Testing

### Backend

- Model: `key` uniqueness, default `enabled=False`.
- Migration: `migrate` on an empty DB creates all six seeded flags with their canonical defaults; running `migrate --fake` twice is a no-op (no duplicates).
- Service: `is_feature_enabled` returns the expected boolean for present / missing / toggled keys.
- API:
  - Unauthenticated GET / PATCH → 401/403.
  - Authenticated non-admin GET → 200 with the full list; PATCH → 403.
  - Admin PATCH flips the flag and the subsequent GET reflects the new value.

### Frontend

No new test harness (repo only runs Playwright). The provider's behavior is deterministic given a mocked API (success / failure / toggle), so it's Playwright-testable but not worth adding E2E coverage for the toggle UI in this change. Manual verification from the admin page is in `tasks.md`.

## Rejected alternatives

- **django-waffle / flipper-py / django-feature-flags** — nice for larger apps, overkill here. One table, one endpoint, a hook, and a service function cover the contract. Adding a library pulls in concepts (flag types, targeting rules, sampler IDs) we don't need and drags the OpenSpec surface well beyond "six boolean toggles."
- **Flags in `NurserySetting`** — would blur the two concerns. `NurserySetting` is the nursery's operator-facing configuration (daily booking limit, branding); flags are engineering-facing toggles for half-built features. Keep them separate so a renaming / restructuring of one doesn't move the other.
- **File-based flags (`settings.FEATURES = {...}`)** — forces a redeploy to toggle and can't be twiddled per environment without templating. The whole point of a flag system is that operators flip it without engineering involvement.
- **Remove the `key` field and use a choices-enum** — ties every new flag to a migration that alters the schema. With `key` as a free string, adding a flag is a data migration, not a schema one.
- **Server-side gating of writes** — tempting (e.g. "when `vet_management` is off, reject POST /api/vets/") but risky: existing data (Owner.primary_vet FKs) would be orphaned or 500 on load. The rule is "flags hide UI, never break data."
