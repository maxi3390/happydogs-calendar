# Tasks

## 1. Backend app
- [x] 1.1 Create `backend/feature_flags/__init__.py` + `apps.py` (AppConfig).
- [x] 1.2 `models.py`: `FeatureFlag(key slug unique, label, description, enabled, updated_at)`.
- [x] 1.3 Migration `0001_initial`: create the table.
- [x] 1.4 Data migration `0002_seed_flags`: seed the six initial flags with defaults + descriptions via `get_or_create(key=...)`.
- [x] 1.5 `services.py`: `is_feature_enabled(key: str) -> bool`.
- [x] 1.6 `serializers.py`: `FeatureFlagSerializer` with `key` read-only (no rekeying via API).
- [x] 1.7 `views.py`: ViewSet with list + retrieve + partial_update, keyed by `key` (not `pk`).
  - list / retrieve → `IsAuthenticated`
  - partial_update → `IsAdminUser`
  - create / destroy → disabled (raise 405).
- [x] 1.8 `urls.py`: DRF router. Lookup field = `key`.
- [x] 1.9 Register `'feature_flags'` in `INSTALLED_APPS` and `nursery/urls.py`.

## 2. Backend tests
- [x] 2.1 Model: `key` unique, `enabled` defaults to False on ad-hoc creation.
- [x] 2.2 Seed migration: after `migrate`, all six canonical flags exist with expected defaults.
- [x] 2.3 `is_feature_enabled`: returns bool for present/missing/toggled keys.
- [x] 2.4 API: `GET /api/feature-flags/` requires auth; returns list for any auth'd user.
- [x] 2.5 API: `PATCH /api/feature-flags/<key>/` requires admin; flips `enabled`.
- [x] 2.6 API: non-admin PATCH → 403; key-mismatched payload (trying to rename) is ignored / rejected.
- [x] 2.7 API: DELETE / POST → 405.

## 3. Frontend domain + provider
- [x] 3.1 `frontend/src/domain/feature-flags/types.ts`: `FeatureFlag` type (id, key, label, description, enabled, updated_at) + `FeatureFlagsMap`.
- [x] 3.2 `frontend/src/domain/feature-flags/api.ts`: `list()` and `toggle(key, enabled)`.
- [x] 3.3 `frontend/src/domain/feature-flags/index.ts` barrel.
- [x] 3.4 Register on `api` in `frontend/src/lib/api.ts` as `api.featureFlags`. Export types.
- [x] 3.5 `frontend/src/lib/feature-flags.tsx`:
  - `FeatureFlagsProvider` — fetches on mount (once auth token is present), stores a `Record<string, boolean>`, re-fetches on login.
  - `useFeatureFlag(key)` hook — returns `flags[key] ?? false`.
  - `useFeatureFlags()` hook — returns the full map + a `refresh()` for the admin page.
- [x] 3.6 Wrap `app/layout.tsx` root tree with `FeatureFlagsProvider` below `TranslationProvider`.

## 4. Admin page
- [x] 4.1 `frontend/src/app/admin/feature-flags/page.tsx` under `withAdmin`.
- [x] 4.2 Lists one card per flag (label / key / description / toggle). Click → `api.featureFlags.toggle(...)` → refresh the map.
- [x] 4.3 Add a "Feature Flags" link to the profile menu (visible only when `isAdmin`) in `Navigation.tsx`.

## 5. Gating
- [x] 5.1 `multiday_schedule` in `ScheduleForm.tsx`: when off, hide end-date input, force `end_date = start_date`.
- [x] 5.2 `custom_pet_species` in `PetForm.tsx`: when on, render a free-text species input that, when non-empty, overrides the dropdown value on submit.
- [x] 5.3 `vet_management`:
  - `Navigation.tsx`: hide the "Vets" profile-menu entry.
  - `OwnerForm.tsx`: hide the entire "Veterinary" section.
  - `PetForm.tsx`: hide the `vet_override` dropdown.
- [x] 5.4 `medical_notes` in `PetForm.tsx`: hide the medical-notes section.
- [x] 5.5 `data_backup` in `app/settings/page.tsx`: hide `<DataBackupSection />`.
- [x] 5.6 `compatibility_warnings` in `ScheduleForm.tsx`: hide conflict warning banner on the post-create result view.

## 6. Translations
- [x] 6.1 `featureFlags.*` namespace in `backend/translations/en.json` + `es.json`:
  - `title`, `description`, `lastUpdated`, `toggleEnable`, `toggleDisable`, `saveFailed`, `empty`.
  - Per-flag label / description under `featureFlags.flags.<key>.label|description`.
- [x] 6.2 `nav.featureFlags` (profile-menu label).
- [x] 6.3 Both JSON files parse clean after the edit.

## 7. Specs
- [x] 7.1 `openspec/changes/feature-flags/specs/backend/feature-flags/spec.md` (ADDED).
- [x] 7.2 `openspec/changes/feature-flags/specs/frontend/feature-flags/spec.md` (ADDED).
- [x] 7.3 Baselines `openspec/specs/backend/feature-flags/spec.md` and `openspec/specs/frontend/feature-flags/spec.md`.

## 8. Verification
- [x] 8.1 `docker compose exec -T backend python manage.py test --settings=nursery.test_settings` — all tests green.
- [x] 8.2 `tsc --noEmit` — zero errors.
- [x] 8.3 Manual: log in as admin, open `/admin/feature-flags`, toggle `vet_management` off — confirm the "Vets" nav entry disappears, and the owner / pet forms no longer show vet sections. Toggle on → they come back.
- [x] 8.4 Manual: toggle `multiday_schedule` off — confirm `ScheduleForm` only shows one date input and the created schedules have `start_date == end_date`.
- [x] 8.5 Manual: toggle `custom_pet_species` on — confirm the extra free-text input appears in `PetForm` and saves through.
