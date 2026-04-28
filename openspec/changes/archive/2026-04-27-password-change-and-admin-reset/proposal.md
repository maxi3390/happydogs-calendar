# Self-service password change + admin password reset

## Why

Password posture today is a half-implemented feature:

- The backend ships a `PUT /api/auth/change-password/` endpoint that asks for `old_password` and updates the user's hash. **No frontend surface** invokes it — a staff member who wants to rotate their password literally cannot.
- The admin side is worse: an admin can update a user's role, name, and active flag through `UserViewSet`, but there is no way to reset a user's password. When a staff member forgets theirs, an admin's only option today is to delete the account and re-create it (which loses the audit trail) or shell into the database and call `user.set_password()` by hand.

Both are routine ops on every multi-user product. Closing the gap is a v1 concern, not a future one.

## What

### Backend

Add `POST /api/users/<id>/set_password/` — an admin-only action on `UserViewSet`. Body: `{ new_password, new_password_confirm }`. No `old_password` (the admin override is the whole point). Validates the new password through Django's configured password validators and ensures the two values match before calling `user.set_password()`.

The existing self-service endpoint stays unchanged.

### Frontend

Two new surfaces, both calling existing endpoints:

1. **`/profile` page** — accessible to any authenticated user. Shows the user's email (read-only — email-change is a separate concern with its own threat model) and a "Change password" form with three inputs (current / new / confirm). Submits to `PUT /api/auth/change-password/`.
2. **Reset password button on `/admin/users`** — per-row action next to Edit / Delete. Opens a modal that takes `new_password` + `new_password_confirm` and calls the new `POST /api/users/<id>/set_password/` endpoint. Success message confirms the reset; the admin then communicates the new password out-of-band (verbally, via DM, etc.).

Both forms fall through to the same client-side validation (passwords match, min length matches Django's default 8), with server-side errors mirrored back into the form fields.

Wire a "Change password" link into the profile-menu dropdown so the page is discoverable.

## Impact

- 1 new serializer (`AdminSetPasswordSerializer`).
- 1 new viewset action (`UserViewSet.set_password`).
- ~5 new backend tests in `accounts/tests/test_user_management_api.py`.
- 2 new frontend API wrappers (`changeOwnPassword`, `setPassword`).
- 1 new page (`/profile`).
- 1 new modal block in `/admin/users`.
- 1 new nav-menu link.
- 2 new Playwright tests.
- 3 spec updates: `backend/auth`, `frontend/auth`, `frontend/user-management`.

## Out of scope

- **Forgot-password / email-based reset.** That's a separate flow (email-token issuance, expiry, revocation) and should land as its own change once we have the production-email-env-vars work in front of it.
- **2FA / TOTP**. Bigger threat-model conversation.
- **Email-change.** Distinct flow with its own verification path.
- **Password-strength meter.** Django's validators reject weak passwords server-side; a client-side meter is nice-to-have but a separate UX concern.
