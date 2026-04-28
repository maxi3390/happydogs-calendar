# Design — Password change + admin reset

## Two endpoints, not one

A single endpoint that accepts an optional `old_password` and is gated on "admin OR self" sounds elegant but actually makes the contract murkier:

- The validation rules differ. The self-service path MUST reject a wrong `old_password`; the admin path MUST NOT require it.
- The audit trail differs. We want the audit log to record "admin X reset user Y's password" distinctly from "user Y rotated their own".
- The frontend forms differ. The self-service form has 3 inputs (current / new / confirm); the admin form has 2 (new / confirm).

Two endpoints with two serializers keeps each call site simple and lets each path evolve independently (e.g. a future "force-password-change-on-next-login" flag belongs in the admin path only).

## DRF action vs separate APIView

`UserViewSet.set_password` as an `@action(detail=True, methods=['post'])` slots cleanly into the existing admin URL space. The auto-generated route is `/api/users/<id>/set_password/`, which mirrors `/api/users/<id>/` (PATCH for general updates) without an extra `urls.py` line. Keeping it on the same viewset also means the `IsAdmin` permission_class on the viewset already gates it — no risk of an APIView accidentally diverging.

## No old_password on the admin path — what about the admin's own account?

Two answers:

1. The admin **can** target their own user id via the admin endpoint. That bypasses the old-password check, which is fine — they're admin, they own the account, and they were the one logged in. A site admin holding their own root key is the standard model.
2. We still expose the self-service endpoint to admins. An admin who wants the safer rotation path (verify old password first, in case they typed their session in via shared workstation) can use it.

So both paths work for an admin's own account; the admin chooses which based on what they're doing.

## Validation layering

Both serializers apply Django's `AUTH_PASSWORD_VALIDATORS` to the new password through the standard DRF `validate_password` validator. The four configured validators (length, common, numeric, similarity) handle the bulk of the policy. The serializer adds:

- `new_password == new_password_confirm` mismatch → 400 with field-pinned error so the frontend can highlight the mismatch on the right input.
- `old_password` (self-service only) is checked AFTER `validate_password` of the new value, so a request with a wrong old AND a weak new gets feedback on both at once instead of having to fix them sequentially.

## Audit log coverage

`User` is intentionally NOT one of the four entities tracked by `django-simple-history` (per `openspec/specs/backend/audit-log/spec.md`): user-account audit is a security concern of a different shape (role escalations, password changes, login attempts) better handled through Django's auth log or a dedicated approach. Password resets fall under that umbrella; we **don't** add `User` to the simple-history tracked set in this change. A future change can add a small dedicated `UserAuditEvent` table with an enum kind (`password_change_self`, `password_change_admin_reset`, `role_change`, etc.) when the team is ready to commit to the shape of that data.

For now, the only signal we leave is Django's standard `LogEntry` (admin actions touching `User` show up there) plus the JWT blacklist that comes for free with simplejwt.

## Should the password reset blacklist active sessions?

Tempting and the right answer for a real product, but actually requires us to revoke every active refresh token the target user has issued. We'd have to:

1. Iterate `OutstandingToken` for the user_id.
2. Add each one to `BlacklistedToken`.
3. Document the side-effect ("after a password reset the user must log in again on every device").

This is a small extra per-call cost but introduces a destructive side-effect that the admin doing the reset might not always want (e.g. they're about to type the password back in for a colleague who's standing right there). v1 keeps it as: **password reset does not blacklist tokens.** A follow-up change can add a `revoke_sessions=true` flag once the operator-facing UX (a checkbox in the reset modal) is settled.

## Frontend: `/profile` page vs modal

A modal triggered from the user menu is lighter to ship but worse for SEO-style discoverability and forecloses where the avatar / preferences / etc. would land later. A real `/profile` page with a "Change password" section gives us a slot for those follow-ups (avatar upload, language preference UI, email change once we add it) without a layout pivot. Cost is one extra route file; benefit is reusable.

The page renders ONLY the password form for now. The user's email is shown as a read-only label so the operator knows whose account they're acting on (defends against the "logged in as the wrong account" surprise).

## Admin reset modal — show the new password back?

After `POST /api/users/<id>/set_password/` returns 200, the modal stays open for ~3 s with a "Password reset" toast and the input cleared, then closes. We do NOT echo the new password back in any persistent surface — the admin literally just typed it; they don't need a confirmation that re-displays it. Echoing it back creates a screen-recording risk.

## Error mapping

DRF returns serializer errors as `{ field_name: [error1, error2] }`. The forms map this directly:

- `old_password: ['Current password is incorrect.']` → highlight Current password input.
- `new_password: ['This password is too common.']` → highlight New password input.
- `new_password_confirm: ['New passwords do not match.']` → highlight Confirm input.
- `non_field_errors` or `detail` → top-of-form banner.

Same shape on both endpoints; same frontend helper for both forms.
