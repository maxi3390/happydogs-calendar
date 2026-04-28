# Authentication and Authorization Specification

## Purpose

This specification defines the authentication and authorization behavior for the pet nursery management system backend. It covers user registration, login, logout, token management, profile operations, password management, and role-based access control. Authentication is email-based and uses JWT tokens.

## Requirements

### Requirement: User Registration

The system SHALL allow new users to register by providing an email address, password, password confirmation, first name, and last name. The email address SHALL serve as the sole identifier for authentication; no username field is used. The system MUST validate that the password confirmation matches the password. The password MUST pass strength validation rules. The email MUST be unique across all registered users. Upon successful registration, the system SHALL return the created user profile.

#### Scenario: Successful Registration

- Given a visitor provides a valid email, a strong password, a matching password confirmation, a first name, and a last name
- When the visitor submits the registration request
- Then the system SHALL create a new user account
- And the system SHALL return the user profile containing the email, first name, and last name

#### Scenario: Registration With Mismatched Password Confirmation

- Given a visitor provides a password and a password confirmation that do not match
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error indicating the passwords do not match
- And no user account SHALL be created

#### Scenario: Registration With Weak Password

- Given a visitor provides a password that does not meet strength validation requirements
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error describing the password weakness
- And no user account SHALL be created

#### Scenario: Registration With Duplicate Email

- Given a user account already exists with a given email address
- When a visitor attempts to register with the same email address
- Then the system SHALL reject the request with a validation error indicating the email is already in use
- And no duplicate user account SHALL be created

#### Scenario: Registration With Missing Required Fields

- Given a visitor omits one or more required fields (email, password, password confirmation, first name, or last name)
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error identifying the missing fields

### Requirement: User Login

The system SHALL allow registered users to log in by providing their email and password. Upon successful authentication, the system SHALL return the user profile along with an access token and a refresh token. The access token SHALL expire after 60 minutes. The refresh token SHALL expire after 7 days.

#### Scenario: Successful Login

- Given a registered user provides a valid email and correct password
- When the user submits the login request
- Then the system SHALL authenticate the user
- And the system SHALL return the user profile (email, first name, last name, role)
- And the system SHALL return an access token with a 60-minute expiration
- And the system SHALL return a refresh token with a 7-day expiration

#### Scenario: Login With Invalid Credentials

- Given a visitor provides an incorrect email or password
- When the visitor submits the login request
- Then the system SHALL reject the request with an authentication error
- And no tokens SHALL be issued

#### Scenario: Login With Non-Existent Email

- Given a visitor provides an email that is not associated with any registered account
- When the visitor submits the login request
- Then the system SHALL reject the request with an authentication error
- And the error message SHOULD NOT reveal whether the email exists in the system

### Requirement: Token Refresh and Rotation

The system SHALL allow users to obtain a new access token by presenting a valid refresh token. Upon successful token refresh, the system SHALL issue a new access token and a new refresh token. The previously used refresh token MUST be blacklisted immediately after use to prevent reuse (token rotation).

#### Scenario: Successful Token Refresh

- Given a user presents a valid, non-blacklisted refresh token
- When the user submits the token refresh request
- Then the system SHALL return a new access token
- And the system SHALL return a new refresh token
- And the system SHALL blacklist the previously used refresh token

#### Scenario: Token Refresh With Blacklisted Token

- Given a user presents a refresh token that has already been blacklisted
- When the user submits the token refresh request
- Then the system SHALL reject the request with an authentication error
- And no new tokens SHALL be issued

#### Scenario: Token Refresh With Expired Token

- Given a user presents a refresh token that has exceeded its 7-day expiration
- When the user submits the token refresh request
- Then the system SHALL reject the request with an authentication error
- And no new tokens SHALL be issued

### Requirement: User Logout

The system SHALL allow authenticated users to log out by presenting their refresh token. Upon successful logout, the system MUST blacklist the provided refresh token so that it can no longer be used for token refresh.

#### Scenario: Successful Logout

- Given an authenticated user provides a valid refresh token
- When the user submits the logout request
- Then the system SHALL blacklist the provided refresh token
- And the system SHALL confirm the logout was successful

#### Scenario: Logout With Invalid Refresh Token

- Given a user provides an invalid or already-blacklisted refresh token
- When the user submits the logout request
- Then the system SHALL reject the request with an error

### Requirement: Profile Viewing

The system SHALL allow authenticated users to view their own profile. The profile SHALL include the user's email, first name, last name, and role.

#### Scenario: View Own Profile

- Given an authenticated user requests their profile
- When the system processes the request
- Then the system SHALL return the user's email, first name, last name, and role

#### Scenario: View Profile Without Authentication

- Given an unauthenticated visitor requests a user profile
- When the system processes the request
- Then the system SHALL reject the request with an authentication error

### Requirement: Profile Updating

The system SHALL allow authenticated users to update their own profile. Users SHALL be able to update their first name and last name only. The email address MUST NOT be changeable through the profile update endpoint.

#### Scenario: Update Own Name

- Given an authenticated user provides a new first name and/or last name
- When the user submits the profile update request
- Then the system SHALL update the user's name fields
- And the system SHALL return the updated user profile

#### Scenario: Attempt To Change Email Via Profile Update

- Given an authenticated user attempts to change their email address through the profile update endpoint
- When the user submits the profile update request
- Then the system SHALL NOT modify the email address
- And the system SHALL ignore the email field in the update payload

### Requirement: Password Change

The system SHALL allow authenticated users to change their password. The user MUST provide their current (old) password along with the new password. The system MUST validate that the old password is correct before accepting the change. The new password MUST pass strength validation rules.

#### Scenario: Successful Password Change

- Given an authenticated user provides their correct current password and a valid new password
- When the user submits the password change request
- Then the system SHALL update the user's password
- And the system SHALL confirm the password was changed successfully

#### Scenario: Password Change With Incorrect Old Password

- Given an authenticated user provides an incorrect current password
- When the user submits the password change request
- Then the system SHALL reject the request with a validation error indicating the old password is incorrect
- And the password SHALL NOT be changed

#### Scenario: Password Change With Weak New Password

- Given an authenticated user provides a correct current password but a new password that does not meet strength requirements
- When the user submits the password change request
- Then the system SHALL reject the request with a validation error describing the password weakness
- And the password SHALL NOT be changed

### Requirement: Role-Based Access Control

The system SHALL support two roles: admin and user. Each user MUST have exactly one role. New users created through registration SHALL be assigned the user role by default. The system SHALL enforce role-based access to endpoints using custom permission rules.

#### Scenario: Default Role Assignment on Registration

- Given a visitor registers a new account
- When the account is created
- Then the system SHALL assign the user role to the new account

#### Scenario: Admin Accessing Admin-Only Endpoint

- Given an authenticated user with the admin role
- When the user accesses an admin-only endpoint
- Then the system SHALL allow access

#### Scenario: Non-Admin Accessing Admin-Only Endpoint

- Given an authenticated user with the user role
- When the user accesses an admin-only endpoint
- Then the system SHALL deny access with a permission error

### Requirement: Admin User Management

The system SHALL provide admin-only endpoints for managing users. Admin users SHALL be able to list all users, view any user's details, update any user's profile, and delete users. These endpoints MUST be restricted to users with the admin role.

#### Scenario: Admin Lists All Users

- Given an authenticated admin user
- When the admin requests the list of all users
- Then the system SHALL return a list of all registered user profiles

#### Scenario: Admin Views Another User's Profile

- Given an authenticated admin user
- When the admin requests the profile of any specific user
- Then the system SHALL return that user's full profile

#### Scenario: Admin Deletes A User

- Given an authenticated admin user
- When the admin requests deletion of a specific user
- Then the system SHALL delete that user account
- And the system SHALL confirm the deletion

#### Scenario: Non-Admin Attempts User Management

- Given an authenticated user with the user role
- When the user attempts to access any user management endpoint
- Then the system SHALL deny access with a permission error

### Requirement: Superuser Creation

The system SHALL provide a mechanism to create superuser accounts. Superuser creation MUST enforce that the created account has the admin role, regardless of any other input.

#### Scenario: Superuser Is Created With Admin Role

- Given an operator creates a superuser account
- When the superuser account is created
- Then the system SHALL assign the admin role to the account
- And this role assignment MUST NOT be overridable during creation

### Requirement: Custom Permission Rules

The system SHALL define the following permission rules for use across all endpoints:

- **IsAdmin**: Only users with the admin role SHALL be granted access.
- **IsAdminOrReadOnly**: Users with the admin role SHALL have full access; all other authenticated users SHALL have read-only access.
- **IsOwnerOrAdmin**: The resource owner or any user with the admin role SHALL be granted access; other users SHALL be denied.
- **IsAuthenticated**: Any authenticated user SHALL be granted access regardless of role.

The default permission for all API endpoints SHALL be open (allow any), with specific permissions overridden on a per-endpoint basis.

#### Scenario: IsAdmin Grants Access to Admin

- Given an authenticated user with the admin role
- When the user accesses an endpoint protected by the IsAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsAdmin Denies Access to Non-Admin

- Given an authenticated user with the user role
- When the user accesses an endpoint protected by the IsAdmin rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsAdminOrReadOnly Allows Admin Full Access

- Given an authenticated user with the admin role
- When the user performs any operation (read or write) on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL allow the request

#### Scenario: IsAdminOrReadOnly Allows Non-Admin Read Access

- Given an authenticated user with the user role
- When the user performs a read operation on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL allow the request

#### Scenario: IsAdminOrReadOnly Denies Non-Admin Write Access

- Given an authenticated user with the user role
- When the user performs a write operation (create, update, delete) on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsOwnerOrAdmin Allows Resource Owner Access

- Given an authenticated user who owns the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsOwnerOrAdmin Allows Admin Access to Any Resource

- Given an authenticated user with the admin role who does not own the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsOwnerOrAdmin Denies Non-Owner Non-Admin Access

- Given an authenticated user with the user role who does not own the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsAuthenticated Allows Any Authenticated User

- Given any authenticated user regardless of role
- When the user accesses an endpoint protected by the IsAuthenticated rule
- Then the system SHALL allow the request

#### Scenario: Unauthenticated Request to Protected Endpoint

- Given an unauthenticated visitor
- When the visitor accesses any endpoint protected by any permission rule
- Then the system SHALL deny the request with an authentication error

### Requirement: User SHALL carry a `language` preference exposed in auth payloads

The `User` model SHALL expose a `language` field — `CharField(max_length=8, choices=[("en","English"),("es","Español")], default="es")`. The field SHALL appear in every API response that returns a user (login, register, token-refresh-derived `me`, profile, and the admin user list).

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
- THEN the response SHALL include `tokens.access` AND a `user` field
- AND `user.language` SHALL be `"en"`

#### Scenario: Self-update succeeds

- GIVEN a user is logged in with `language = "es"`
- WHEN they `PATCH /api/users/me/language/` with `{"language": "en"}`
- THEN the response SHALL be HTTP 200
- AND the user row SHALL persist `language = "en"`

#### Scenario: Unknown choice is rejected

- WHEN a user `PATCH /api/users/me/language/` with `{"language": "fr"}`
- THEN the response SHALL be HTTP 400
- AND the user row SHALL be unchanged

#### Scenario: Unauthenticated caller is rejected

- WHEN no `Authorization` header is present
- AND the caller `PATCH /api/users/me/language/` with any body
- THEN the response SHALL be HTTP 401

### Requirement: Notification email body language SHALL match `recipient_user.language`

When the notification cron sends a staff-internal email, the localised subject and body SHALL be resolved against `recipient_user.language` rather than a hardcoded English. The fallback chain SHALL be `recipient.language` → `'es'` (the system default) → English literal text from the translation file.

#### Scenario: English-preferring staff member receives an English notification

- GIVEN user Alice has `language = "en"`
- AND the cron creates a `pet_birthday` notification for Alice
- WHEN the email is sent
- THEN the subject and body SHALL match the strings under `notifications.staff_email.pet_birthday.*` in `translations/en.json`

#### Scenario: Spanish-preferring staff member receives a Spanish notification

- GIVEN user Alice has `language = "es"`
- AND the cron creates a `pet_birthday` notification for Alice
- WHEN the email is sent
- THEN the subject and body SHALL match the strings under `notifications.staff_email.pet_birthday.*` in `translations/es.json`

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

- WHEN admin Alice POSTs `/api/users/<bob_id>/set_password/` with mismatched values
- THEN the response SHALL be HTTP 400
- AND the body SHALL include a `new_password_confirm` field error

#### Scenario: New password fails policy

- WHEN admin Alice POSTs `/api/users/<bob_id>/set_password/` with `{ new_password: '1234', new_password_confirm: '1234' }`
- THEN the response SHALL be HTTP 400
- AND the body SHALL include a `new_password` field error

#### Scenario: Non-admin is refused

- WHEN non-admin user Bob POSTs `/api/users/<some_other_id>/set_password/`
- THEN the response SHALL be HTTP 403

#### Scenario: Unauthenticated caller is refused

- WHEN a caller without an Authorization header POSTs `/api/users/<id>/set_password/`
- THEN the response SHALL be HTTP 401

#### Scenario: Admin resets their own password through the admin endpoint

- WHEN admin Alice POSTs `/api/users/<alice_id>/set_password/` with valid values
- THEN the response SHALL be HTTP 200
- AND Alice SHALL be able to log in with the new password without supplying the old one

### Requirement: Admin SHALL be able to drive lifecycle actions on a user

The system SHALL expose per-user lifecycle actions on `UserViewSet`,
each gated by `IsAdmin`:

- `POST /api/users/<id>/deactivate/` — sets `is_active=False`.
- `POST /api/users/<id>/activate/` — sets `is_active=True`.
- `POST /api/users/<id>/promote/` — sets `role='admin'`.
- `POST /api/users/<id>/demote/` — sets `role='user'`.

Each action SHALL return HTTP 200 with the updated user shape.

#### Scenario: Admin deactivates a regular user

- WHEN admin Alice POSTs `/api/users/<bob_id>/deactivate/`
- THEN the response SHALL be HTTP 200
- AND Bob's `is_active` SHALL be `False`
- AND Bob SHALL NOT be able to log in afterwards (per existing login spec)

#### Scenario: Admin reactivates an inactive user

- GIVEN Bob has `is_active=False`
- WHEN admin Alice POSTs `/api/users/<bob_id>/activate/`
- THEN the response SHALL be HTTP 200
- AND Bob's `is_active` SHALL be `True`

#### Scenario: Admin promotes a user to admin

- WHEN admin Alice POSTs `/api/users/<bob_id>/promote/`
- THEN the response SHALL be HTTP 200
- AND Bob's `role` SHALL be `'admin'`

#### Scenario: Admin demotes another admin to user

- WHEN admin Alice POSTs `/api/users/<charlie_id>/demote/`
- THEN the response SHALL be HTTP 200
- AND Charlie's `role` SHALL be `'user'`

### Requirement: Admin SHALL NOT be able to deactivate / demote / delete themselves

Self-protection guards apply to the per-user destructive actions
(`deactivate`, `demote`, `destroy`) and to bulk actions that include
the requester. Each SHALL return HTTP 400 with a `detail` field
explaining the rejection.

#### Scenario: Admin tries to deactivate self

- WHEN admin Alice POSTs `/api/users/<alice_id>/deactivate/`
- THEN the response SHALL be HTTP 400
- AND Alice's `is_active` SHALL remain `True`

#### Scenario: Admin tries to delete themselves

- WHEN admin Alice DELETEs `/api/users/<alice_id>/` (after deactivating via the database)
- THEN the response SHALL be HTTP 400
- AND Alice's record SHALL still exist

### Requirement: The system SHALL refuse actions that leave zero active admins

The lifecycle actions and their bulk counterparts SHALL refuse, with
HTTP 400 and `{ "detail": "Cannot remove the last active admin." }`,
any operation that would drop the count of active-admin users
(`role='admin' AND is_active=True`) to zero.

This applies to `deactivate`, `demote`, `destroy`, and the `bulk_*`
analogues.

#### Scenario: Demoting the last active admin is refused

- GIVEN Alice (active admin) and Bob (active admin) are the only two active admins, and Alice's `is_active` is set to `False` via direct DB write
- WHEN a request authenticated as Alice POSTs `/api/users/<bob_id>/demote/`
- THEN the response SHALL be HTTP 400
- AND Bob's `role` SHALL remain `'admin'`

### Requirement: `DELETE /api/users/<id>/` SHALL refuse active users

The `destroy` endpoint SHALL refuse, with HTTP 400 and
`{ "detail": "User must be deactivated before deletion." }`, any
attempt to delete a user whose `is_active=True`. Operators must
deactivate the user first.

#### Scenario: Active user cannot be deleted

- GIVEN Bob has `is_active=True`
- WHEN admin Alice DELETEs `/api/users/<bob_id>/`
- THEN the response SHALL be HTTP 400
- AND Bob's record SHALL still exist

#### Scenario: Inactive user can be deleted

- GIVEN Bob has `is_active=False`
- WHEN admin Alice DELETEs `/api/users/<bob_id>/`
- THEN the response SHALL be HTTP 204
- AND Bob's record SHALL no longer exist

### Requirement: `GET /api/users/<id>/deletion_impact/` SHALL return side-effect counts

The deletion-impact endpoint SHALL return the side-effect counts for
deleting the target user, so the frontend can show what will be
discarded / anonymized before the operator confirms. Response shape:

```json
{ "notifications": <int>, "audit_log_entries": <int> }
```

`notifications` counts rows whose `recipient_user` is the target
(CASCADE-deleted on user delete). `audit_log_entries` sums the
historical-records rows whose `history_user` is the target across
the tracked entities (Pet, Owner, MedicalNote); their `history_user`
is `SET_NULL` on user delete (rows survive, anonymized).

#### Scenario: User with no related rows reports zeroes

- GIVEN Bob has no notifications and no audit-log entries
- WHEN admin Alice GETs `/api/users/<bob_id>/deletion_impact/`
- THEN the response SHALL be HTTP 200
- AND the body SHALL be `{ "notifications": 0, "audit_log_entries": 0 }`

### Requirement: Bulk endpoints SHALL operate on lists of user ids

The viewset SHALL expose `bulk_deactivate`, `bulk_activate`,
`bulk_delete`, and `bulk_set_role` actions, all admin-only and all
accepting `{ "ids": [int, ...] }` in the JSON body. `bulk_set_role`
also accepts a `role` field (`'admin' | 'user'`).

Each runs in a single `transaction.atomic` block. Bulk-delete
SHALL refuse if any target is still active. Bulk-set-role to
`'user'` SHALL refuse if the action would leave zero active
admins. The self-protection guard SHALL apply (the requesting
admin's id MUST NOT appear in `ids` for `bulk_deactivate`,
`bulk_delete`, or `bulk_set_role` with `role='user'`).

#### Scenario: bulk_deactivate succeeds for multiple ids

- WHEN admin Alice POSTs `/api/users/bulk_deactivate/` with `{"ids": [b_id, c_id]}`
- THEN the response SHALL be HTTP 200 and the body SHALL include `{"updated": 2}`
- AND both target users SHALL have `is_active=False`

#### Scenario: bulk_delete refuses while any target is still active

- GIVEN Bob is active and Charlie is inactive
- WHEN admin Alice POSTs `/api/users/bulk_delete/` with `{"ids": [b_id, c_id]}`
- THEN the response SHALL be HTTP 400
- AND neither user SHALL be deleted

### Requirement: `GET /api/users/` SHALL accept role / status / last-login filters

The list endpoint SHALL apply server-side filters from query params:

- `role=admin|user`
- `is_active=true|false`
- `last_login_within_days=<int>` — match users whose `last_login` is within the last N days
- `last_login_never=true` — match users whose `last_login IS NULL`

The two `last_login_*` params are mutually exclusive (the server
honours `last_login_within_days` if both are provided).

#### Scenario: Filter by role returns matching users only

- GIVEN three users in the system: 2 admins and 1 regular user
- WHEN admin Alice GETs `/api/users/?role=admin`
- THEN the response SHALL contain exactly the 2 admin users

#### Scenario: Filter by status

- GIVEN one active and one inactive user
- WHEN admin Alice GETs `/api/users/?is_active=false`
- THEN the response SHALL contain exactly the inactive user
