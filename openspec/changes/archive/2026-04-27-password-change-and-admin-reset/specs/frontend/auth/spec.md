# ADDED: Frontend / Auth

## ADDED Requirements

### Requirement: Authenticated users SHALL have a `/profile` page where they can rotate their password

The system SHALL provide a `/profile` route, protected by the `withAuth` HOC, that any authenticated user can reach from the profile-menu dropdown via a "Change password" link.

The page SHALL render the user's email as a read-only label and a "Change password" form with three inputs: `current_password`, `new_password`, `new_password_confirm`. The form SHALL submit to `PUT /api/auth/change-password/`.

Client-side validation SHALL refuse to submit when:

- Any of the three inputs is empty.
- `new_password` is shorter than 8 characters.
- `new_password !== new_password_confirm`.

Server-side errors returned by the API SHALL be mapped to the matching input:

- `old_password` errors → highlight the Current password input.
- `new_password` errors → highlight the New password input.
- `new_password_confirm` errors → highlight the Confirm input.
- `non_field_errors` / `detail` → top-of-form banner.

On HTTP 200 the form SHALL clear all three inputs and show a success state for at least 3 seconds before the page returns to its default appearance.

#### Scenario: User changes their password successfully

- GIVEN user Alice is logged in
- AND Alice navigates to `/profile`
- WHEN Alice fills the form with her current password and a valid new password (matching confirm)
- AND Alice submits the form
- THEN the response SHALL be HTTP 200
- AND a success state SHALL be visible
- AND Alice SHALL be able to log in with the new password

#### Scenario: Wrong current password

- GIVEN user Alice is logged in
- AND Alice fills the form with the wrong `current_password`
- WHEN Alice submits the form
- THEN the response SHALL be HTTP 400
- AND the Current password input SHALL be marked invalid with the server's message

#### Scenario: Mismatched new passwords blocks submission client-side

- GIVEN Alice fills the form with `new_password = 'NewPass456!'` and `new_password_confirm = 'TypoPass456!'`
- WHEN Alice clicks Save
- THEN the form SHALL NOT be submitted to the server
- AND the Confirm input SHALL show a "Passwords do not match" error

#### Scenario: "Change password" link in the profile menu

- GIVEN user Alice is logged in
- WHEN Alice opens the profile-menu dropdown
- THEN a "Change password" link SHALL be visible
- AND clicking it SHALL navigate to `/profile`
