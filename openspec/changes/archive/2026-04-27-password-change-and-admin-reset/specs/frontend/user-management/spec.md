# ADDED: Frontend / User Management

## ADDED Requirements

### Requirement: Admins SHALL be able to reset any user's password from the admin user list

Each row in `/admin/users` SHALL include a "Reset password" action button alongside the existing Edit and Delete buttons. Clicking it SHALL open a modal with two inputs: `new_password` and `new_password_confirm`.

The modal SHALL submit to `POST /api/users/<id>/set_password/`. Client-side validation matches the `/profile` form (non-empty, ≥ 8 characters, two values match). Server-side errors SHALL be mapped to the matching input.

On HTTP 200 the modal SHALL close and a "Password reset" toast SHALL be visible for at least 3 seconds. The new password SHALL NOT be echoed back in any persistent surface (no toast text, no inline confirmation, no row-level annotation) — the admin just typed it; re-displaying it creates a screen-recording risk.

#### Scenario: Admin resets a user's password

- GIVEN admin Alice is logged in
- AND user Bob exists in the admin user list
- WHEN Alice opens Bob's "Reset password" modal
- AND Alice fills both inputs with `NewPass456!`
- AND Alice submits
- THEN the response SHALL be HTTP 200
- AND a "Password reset" toast SHALL appear
- AND the modal SHALL close
- AND the new password SHALL NOT appear anywhere on the page text

#### Scenario: Mismatched passwords surface inline

- GIVEN Alice has the modal open with `new_password = 'NewPass456!'` and `new_password_confirm = 'TypoPass456!'`
- WHEN Alice clicks Reset
- THEN the request SHALL NOT be sent to the server (client-side check)
- AND the Confirm input SHALL show a "Passwords do not match" error

#### Scenario: The Reset password button is admin-only

- GIVEN user Bob is a non-admin
- WHEN Bob navigates to any URL guarded by the admin user list
- THEN Bob SHALL be redirected away (the existing `withAdmin` HOC behaviour)
- AND the Reset password button is therefore unreachable for non-admin users
