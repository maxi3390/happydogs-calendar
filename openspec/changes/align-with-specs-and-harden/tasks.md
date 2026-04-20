# Tasks

## 1. Backend code fixes

- [x] 1.1 Refactor `Pet.is_compatible_with()` to return `(bool, list[str])` — collect all triggered rules
- [x] 1.2 Update `PetViewSet.compatibility` endpoint to include `reasons` list alongside `reason`
- [x] 1.3 Update schedule conflict detection (`Schedule.check_conflicts()` + `check_conflicts` endpoint + batch create) to include `reasons` list per conflict
- [x] 1.4 Rename `limit` → `daily_booking_limit` in `ScheduleViewSet.daily_count` response

## 2. Backend security

- [x] 2.1 Add `@permission_classes([IsAdmin])` to `update_nursery_settings`
- [x] 2.2 Add `@permission_classes([IsAdmin])` to `upload_logo`
- [x] 2.3 Add `@permission_classes([IsAdmin])` to `delete_logo`
- [x] 2.4 Leave `get_nursery_settings` as AllowAny (document the exception)

## 3. Frontend runtime bug fixes

- [x] 3.1 Add `logoUrl` useState + fetch in login page
- [x] 3.2 Add `logoUrl` useState + fetch in Navigation
- [x] 3.3 Add `pendingProfilePicture` useState in PetForm
- [x] 3.4 Add `pendingProfilePicture` useState in OwnerForm
- [x] 3.5 Update `DailyCountResult` type: rename `limit` → `daily_booking_limit`
- [x] 3.6 Update ScheduleForm to read `daily_booking_limit`

## 4. Backend tests

- [x] 4.1 Pets: `test_compatibility_multiple_rules_triggered` — aggressive+size+dominance pet reports all rules
- [x] 4.2 Pets: `test_pet_deletion_cascades_to_schedules`
- [x] 4.3 Pets: `test_delete_profile_picture_when_none_exists` returns 204
- [x] 4.4 Owners: `test_owner_deletion_cascades_to_pets`
- [x] 4.5 Schedules: `test_create_schedule_rejects_equal_start_end_time`
- [x] 4.6 Schedules: `test_daily_count_returns_daily_booking_limit_field`
- [x] 4.7 Documents: create `test_document_api.py` covering upload (image/PDF/DOC), list filter by pet/owner, delete, reject both-pet-and-owner, reject neither, original_filename preserved, reject oversized
- [x] 4.8 Settings: `test_non_admin_cannot_update_settings`
- [x] 4.9 Settings: `test_non_admin_cannot_upload_logo`
- [x] 4.10 Settings: `test_non_admin_cannot_delete_logo`
- [x] 4.11 Settings: `test_admin_can_update_settings`
- [x] 4.12 Settings: `test_get_settings_does_not_require_auth` (public for logo)
- [x] 4.13 Auth: `test_blacklisted_refresh_token_rejected`
- [x] 4.14 Auth: `test_profile_update_ignores_email_field`
- [x] 4.15 Medical notes: `test_create_without_title_rejected`, `test_create_without_pet_rejected`
- [x] 4.16 Translations: `test_translations_endpoint_allows_unauthenticated_access`

## 5. Update main specs

- [x] 5.1 Update `openspec/specs/backend/pets/spec.md` — document `reasons` list in compatibility response
- [x] 5.2 Update `openspec/specs/backend/schedules/spec.md` — rename field to `daily_booking_limit`; note `reasons` in conflicts
- [x] 5.3 Update `openspec/specs/backend/settings/spec.md` — note GET is intentionally public; writes require IsAdmin

## 6. Archive completed changes

- [x] 6.1 Move `openspec/changes/add-system-logo/` → `openspec/changes/archive/YYYY-MM-DD-add-system-logo/`
- [x] 6.2 Move `openspec/changes/avatar-on-create/` → `openspec/changes/archive/YYYY-MM-DD-avatar-on-create/`

## 7. Verification

- [x] 7.1 `make test-backend` passes
- [x] 7.2 No Python syntax errors (ast.parse)
- [x] 7.3 No TypeScript/lint regressions on touched frontend files
