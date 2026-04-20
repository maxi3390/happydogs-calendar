# Proposal: Align Implementation with Specs and Harden Security

## Intent

An audit comparing the current implementation to the OpenSpec specifications revealed several real divergences — both in backend behavior that contradicts the specs, and critical runtime bugs in the frontend where state variables were referenced but never declared. This change brings the code back in line with the specs, hardens permission enforcement on settings endpoints, and fills significant test coverage gaps.

## Scope

### In scope

**Backend behavior fixes:**
- Pet compatibility endpoint: return **all** triggered incompatibility reasons (not just the first one) per spec "Multiple Rules Triggered for Same Pair".
- Schedule `daily_count` endpoint: rename response field `limit` → `daily_booking_limit` to match spec.
- Schedule validation: reject zero-duration schedules where `start_time == end_time` (spec requires "start time MUST be before end time").

**Backend security hardening:**
- Enforce `IsAdmin` on all settings-write endpoints (`PATCH/PUT /api/settings/update/`, `POST /api/settings/upload_logo/`, `DELETE /api/settings/delete_logo/`).
- `GET /api/settings/` stays `AllowAny` intentionally (login page needs to fetch logo before authentication).

**Frontend runtime bug fixes:**
- `frontend/src/app/login/page.tsx` references `logoUrl` without declaring it → add `useState` + fetch.
- `frontend/src/components/Navigation.tsx` references `logoUrl` without declaring it → add `useState` + fetch.
- `frontend/src/components/PetForm.tsx` references `pendingProfilePicture` without declaring it → add `useState<File | null>`.
- `frontend/src/components/OwnerForm.tsx` references `pendingProfilePicture` without declaring it → add `useState<File | null>`.

**Missing tests:**
- Compatibility: multiple rules triggered for one pair reported together.
- Schedules: zero-duration rejected; cascade delete (pet → schedules).
- Owners: cascade delete (owner → pets).
- Documents: full API test file (currently no coverage at all).
- Settings: admin-only permission enforcement on writes; logo upload/delete admin enforcement.
- Auth: blacklisted refresh token rejected; profile update ignores email field.
- Translations: unauthenticated access allowed.

### Out of scope

- List-endpoint pagination (separate architectural change).
- Environment-security settings (`CORS_ALLOW_ALL_ORIGINS`, `DEBUG`, `ALLOWED_HOSTS`) — deployment configuration, not code.
- Frontend accessibility improvements (ARIA labels, keyboard navigation).
- Frontend form UX improvements (password clearing on error, field-level error indicators).
- Default language change (Spanish → English) — the spec's English default is actually wrong for this project (built for Latin American market); the current Spanish default is correct and the main spec will be updated separately.

## Approach

Treat this as a single cohesive "cleanup and alignment" change because the fixes are tightly related (many tests depend on the fixed behavior).

**Backend:** Refactor `Pet.is_compatible_with()` to return a list of reasons instead of a single string. Update the compatibility endpoint and schedule conflict-check responses to surface all reasons. Rename one field in `daily_count` response. Tighten schedule-time validation. Wrap `@api_view` decorators with `@permission_classes([IsAdmin])` for the three write endpoints.

**Frontend:** Add the missing `useState` declarations and a `useEffect` that calls `api.nurserySettings.get()` to populate `logoUrl`. For the form components, add a simple `pendingProfilePicture` file state that's passed to `api.pets.createWithAvatar()` / `api.owners.createWithAvatar()` on submit.

**Tests:** Extend existing test files and create a new `test_document_api.py`.

**Specs:** Update the two existing main specs that have divergences (`pets/spec.md`, `schedules/spec.md`, `settings/spec.md`) to reflect the corrected behavior.

**Archive:** `add-system-logo` and `avatar-on-create` are fully implemented (once the runtime bugs are fixed). Move them to `openspec/changes/archive/` with the date prefix per OpenSpec convention.
