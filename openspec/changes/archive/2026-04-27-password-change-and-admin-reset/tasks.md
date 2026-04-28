# Tasks — Password change + admin reset

## Phase 1 — Backend

- [x] Add `AdminSetPasswordSerializer` in `accounts/serializers.py` with `new_password` (validated by Django's `validate_password`) and `new_password_confirm` plus a `validate` that enforces match.
- [x] Add `set_password` action to `UserViewSet` (admin-only via the viewset's `IsAdmin` permission class). Returns `{ message: 'Password reset' }` on success.
- [x] Smoke-test the route resolves at `POST /api/users/<id>/set_password/` (DRF's default action routing).

## Phase 2 — Backend tests (in `accounts/tests/test_user_management_api.py`)

- [x] `test_admin_can_reset_user_password_and_login_with_new_one` — admin POSTs new password, login with the new password succeeds.
- [x] `test_admin_reset_password_mismatch_400` — passwords don't match → 400 with `new_password_confirm` error.
- [x] `test_admin_reset_password_weak_400` — `new_password='1234'` (too short / numeric) → 400 with `new_password` error.
- [x] `test_non_admin_cannot_reset_user_password_403` — regular user → 403.
- [x] `test_unauthenticated_cannot_reset_user_password_401` — no auth → 401.
- [x] `test_admin_can_reset_own_password_via_admin_endpoint` — admin targeting their own user id succeeds without `old_password`.

## Phase 3 — Frontend API + types

- [x] Add `changeOwnPassword(old_password, new_password, new_password_confirm)` to `usersApi`. Wraps `PUT /api/auth/change-password/`.
- [x] Add `setPassword(id, new_password, new_password_confirm)` to `usersApi`. Wraps `POST /api/users/<id>/set_password/`.
- [x] Common `mapPasswordErrors(json)` helper in `frontend/src/domain/users/passwordErrors.ts` so both forms share the same error-to-field mapping.

## Phase 4 — Frontend `/profile` page

- [x] Create `frontend/src/app/profile/page.tsx` wrapped in `withAuth`.
- [x] Render the user's email as a read-only label.
- [x] Render a "Change password" form with three inputs (current / new / confirm), client-side checks (passwords match, min 8), and server-side error mapping per the design.
- [x] Show a success toast / banner on 200 and clear the form.

## Phase 5 — Profile menu link

- [x] Add a "Change password" link to the profile-menu dropdown in `frontend/src/components/Navigation.tsx`, pointing at `/profile`.
- [x] Translation keys: `auth.changePassword` (EN: "Change password", ES: "Cambiar contraseña") in both `backend/translations/en.json` and `backend/translations/es.json`.
- [x] Add the same keys to the Playwright translation mocks in `frontend/tests/helpers.ts`.

## Phase 6 — Admin reset on `/admin/users`

- [x] Add a "Reset password" button (key icon) per row next to Edit / Delete.
- [x] Open a modal with two inputs (`new_password`, `new_password_confirm`), the same client-side / server-side validation as `/profile`.
- [x] On success, close the modal and show a "Password reset" toast for ~3 s.
- [x] Do NOT echo the new password back anywhere persistent.

## Phase 7 — Frontend tests

- [x] `tests/profile.spec.ts` — self-service flow: navigate to `/profile`, fill form with the wrong old password, expect "Current password is incorrect"; fill it correctly, expect a success state and the user can re-login with the new password.
- [x] `tests/admin-reset-password.spec.ts` — admin flow: log in as admin, open `/admin/users`, click Reset password on a target row, fill new password + confirm, expect the success toast.

## Phase 8 — Spec + archive

- [x] Update `openspec/specs/backend/auth/spec.md` with the new admin set_password endpoint requirement + scenarios.
- [x] Update `openspec/specs/frontend/auth/spec.md` with the `/profile` page requirement + scenarios.
- [x] Update `openspec/specs/frontend/user-management/spec.md` with the admin reset password requirement + scenarios.
- [x] Update `backend/AGENTS.md` Authentication section to mention the new endpoint.
- [x] Update `frontend/AGENTS.md` Authentication section to mention the new `/profile` page.
- [x] Archive this change folder.
