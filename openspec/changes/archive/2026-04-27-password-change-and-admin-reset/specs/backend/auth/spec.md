# ADDED: Backend / Auth

## ADDED Requirements

### Requirement: Admins SHALL be able to reset any user's password without knowing it

The system SHALL expose `POST /api/users/<id>/set_password/`. The endpoint SHALL be admin-only (`role = "admin"`); non-admins SHALL receive HTTP 403, unauthenticated requests SHALL receive HTTP 401.

The request body SHALL be `{ new_password, new_password_confirm }`. `old_password` SHALL NOT be required (the admin override is the whole point of this endpoint — it's how a forgotten-password recovery works in a single-tenant nursery without an email-based flow). On success the response SHALL be HTTP 200 with `{ message: 'Password reset' }`.

The new password SHALL pass Django's configured `AUTH_PASSWORD_VALIDATORS`. A failing validator SHALL surface as HTTP 400 with the failing message pinned to the `new_password` field.

The two password values SHALL match. A mismatch SHALL surface as HTTP 400 with the message pinned to the `new_password_confirm` field.

The endpoint SHALL accept the admin targeting their own `<id>`; admins are explicitly allowed to reset their own password through this path without supplying their old one.

The endpoint SHALL NOT blacklist the target user's outstanding refresh tokens. Active sessions stay valid until the next access-token expiry; a future change can add an opt-in `revoke_sessions` flag.

#### Scenario: Admin resets a user's password and the user can log in with the new one

- GIVEN admin Alice is logged in
- AND user Bob exists with password `OldPass123!`
- WHEN Alice POSTs `/api/users/<bob_id>/set_password/` with `{ new_password: 'NewPass456!', new_password_confirm: 'NewPass456!' }`
- THEN the response SHALL be HTTP 200
- AND Bob SHALL be able to log in with `NewPass456!`
- AND Bob SHALL NOT be able to log in with `OldPass123!`

#### Scenario: Mismatched password values

- GIVEN admin Alice is logged in
- AND user Bob exists
- WHEN Alice POSTs `/api/users/<bob_id>/set_password/` with `{ new_password: 'NewPass456!', new_password_confirm: 'TypoPass456!' }`
- THEN the response SHALL be HTTP 400
- AND the response body SHALL include a `new_password_confirm` field error

#### Scenario: New password fails policy

- GIVEN admin Alice is logged in
- AND user Bob exists
- WHEN Alice POSTs `/api/users/<bob_id>/set_password/` with `{ new_password: '1234', new_password_confirm: '1234' }`
- THEN the response SHALL be HTTP 400
- AND the response body SHALL include a `new_password` field error (length / numeric validator)

#### Scenario: Non-admin is refused

- GIVEN user Bob is a non-admin authenticated user
- WHEN Bob POSTs `/api/users/<some_other_id>/set_password/`
- THEN the response SHALL be HTTP 403

#### Scenario: Unauthenticated caller is refused

- GIVEN no Authorization header is present
- WHEN the caller POSTs `/api/users/<id>/set_password/`
- THEN the response SHALL be HTTP 401

#### Scenario: Admin resets their own password through the admin endpoint

- GIVEN admin Alice is logged in
- WHEN Alice POSTs `/api/users/<alice_id>/set_password/` with valid `new_password` + `new_password_confirm`
- THEN the response SHALL be HTTP 200
- AND Alice SHALL be able to log in with the new password (no `old_password` was required)
