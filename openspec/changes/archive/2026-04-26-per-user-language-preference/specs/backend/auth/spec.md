# MODIFIED: Backend / Auth

## ADDED Requirements

### Requirement: `User` SHALL carry a `language` preference exposed in auth payloads

The `User` model SHALL gain a `language` field — `CharField(max_length=8, choices=[("en","English"),("es","Español")], default="es")`. The field SHALL appear in every API response that returns a user (login, register, token refresh, `me`, admin user list).

A new endpoint `PATCH /api/users/me/language/` SHALL allow an authenticated user to change their own language. The body SHALL be `{"language": "<choice>"}`. The endpoint SHALL:

- Reject values outside the choices with HTTP 400.
- Reject unauthenticated callers with HTTP 401.
- Return the updated user shape on success (HTTP 200).

The endpoint SHALL NOT permit a user to change someone else's language. The existing admin user-management endpoints continue to allow admins to update other users.

#### Scenario: New user defaults to Spanish

- GIVEN a freshly-registered user
- WHEN the registration response is inspected
- THEN the user payload SHALL include `language: "es"`

#### Scenario: Login response includes language

- GIVEN a user with `language = "en"`
- WHEN they `POST /api/auth/login/`
- THEN the `tokens.access` AND the `user` field SHALL be returned
- AND the `user.language` SHALL be `"en"`

#### Scenario: Self-update succeeds

- GIVEN a user is logged in with `language = "es"`
- WHEN they `PATCH /api/users/me/language/` with `{"language": "en"}`
- THEN the response SHALL be HTTP 200
- AND the user row SHALL be persisted with `language = "en"`

#### Scenario: Unknown choice is rejected

- WHEN a user `PATCH /api/users/me/language/` with `{"language": "fr"}`
- THEN the response SHALL be HTTP 400
- AND the user row SHALL be unchanged

### Requirement: Notification email body language SHALL match `recipient_user.language`

When the notification cron sends a staff-internal email, the localised subject and body SHALL be resolved against `recipient_user.language` rather than a hardcoded English. The fallback chain SHALL be `recipient.language` → `'es'` (the system default) → English literal text from the translation file.

#### Scenario: English-preferring staff member receives an English notification

- GIVEN user Alice has `language = "en"`
- AND the cron creates a `pet_birthday` notification for Alice
- WHEN the email is sent
- THEN the subject and body SHALL match the strings under `notifications.staff_email.pet_birthday.*` in `translations/en.json`
