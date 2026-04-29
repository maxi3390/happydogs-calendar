# User Management Specification

## Purpose

Provide an administrative interface for managing system users, including creating, editing, searching, and deleting user accounts. The page SHALL display summary statistics and a searchable table of all users. Access MUST be restricted to users with the admin role.

## Requirements

### Requirement: Admin-Only Access

The user management page MUST be accessible only to authenticated users with the admin role. Non-admin authenticated users and unauthenticated visitors SHALL be redirected away from the page.

#### Scenario: Admin user accesses user management

- Given the user is authenticated with the admin role
- When the user navigates to the user management page
- Then the page SHALL be displayed with all management controls visible

#### Scenario: Non-admin authenticated user accesses user management

- Given the user is authenticated but does not have the admin role
- When the user navigates to the user management page
- Then the user SHALL be redirected away from the page
- And user management content SHALL NOT be rendered

#### Scenario: Unauthenticated user accesses user management

- Given the user is not authenticated
- When the user attempts to navigate to the user management page
- Then the user SHALL be redirected to the login page

### Requirement: Statistics Cards

The user management page SHALL display summary statistics as visual cards showing key metrics about the user base.

#### Scenario: Display total user count

- Given the user is on the user management page
- When the page loads
- Then a statistics card SHALL display the total number of registered users

#### Scenario: Display admin count

- Given the user is on the user management page
- When the page loads
- Then a statistics card SHALL display the number of users with the admin role

#### Scenario: Display active user count

- Given the user is on the user management page
- When the page loads
- Then a statistics card SHALL display the number of currently active users

#### Scenario: Statistics update after user changes

- Given the user has created, edited, or deleted a user
- When the operation completes successfully
- Then the statistics cards SHALL update to reflect the current counts

### Requirement: User Search

The page SHALL provide a search mechanism to filter the displayed users by email address, first name, or last name.

#### Scenario: Search by email

- Given the user table contains multiple users
- When the admin enters an email address or partial email in the search field
- Then the table SHALL display only users whose email matches the search term

#### Scenario: Search by first name

- Given the user table contains multiple users
- When the admin enters a first name or partial first name in the search field
- Then the table SHALL display only users whose first name matches the search term

#### Scenario: Search by last name

- Given the user table contains multiple users
- When the admin enters a last name or partial last name in the search field
- Then the table SHALL display only users whose last name matches the search term

#### Scenario: Search with no results

- Given the user table contains multiple users
- When the admin enters a search term that matches no users
- Then the table SHALL display an empty state or a message indicating no users were found

#### Scenario: Clear search

- Given the admin has an active search filter
- When the admin clears the search field
- Then the table SHALL display all users without any filter applied

### Requirement: User Table Display

The page SHALL present users in a table format with specific columns for user identity, role, status, creation date, and available actions.

#### Scenario: Display user identity column

- Given the user table is visible
- When users are listed
- Then each row SHALL display the user's avatar, full name, and email address in the user column

#### Scenario: Display user avatar with initials fallback

- Given a user does not have a profile image
- When the user's row is rendered in the table
- Then an avatar SHALL be displayed showing the user's initials as a fallback

#### Scenario: Display user avatar with image

- Given a user has a profile image
- When the user's row is rendered in the table
- Then the avatar SHALL display the user's profile image

#### Scenario: Display role column with badge

- Given users have assigned roles
- When the table is rendered
- Then each user's role SHALL be displayed as a badge
- And admin roles SHALL be displayed with a purple badge
- And regular user roles SHALL be displayed with a blue badge

#### Scenario: Display status column with badge

- Given users have active or inactive statuses
- When the table is rendered
- Then each user's status SHALL be displayed as a badge
- And active status SHALL be displayed with a green badge
- And inactive status SHALL be displayed with a red badge

#### Scenario: Display creation date column

- Given users have creation timestamps
- When the table is rendered
- Then each user's creation date SHALL be displayed in the created date column

#### Scenario: Display actions column

- Given the table is rendered
- When a user row is displayed
- Then the actions column SHALL provide controls for editing and deleting that user

### Requirement: Create User

The admin SHALL be able to create new user accounts through a modal dialog with fields for all required user information.

#### Scenario: Open create user modal

- Given the admin is on the user management page
- When the admin activates the create user action
- Then a modal dialog SHALL appear with fields for email, first name, last name, role selection, and password

#### Scenario: Successfully create a new user

- Given the create user modal is open
- And the admin has filled in all required fields with valid data
- When the admin confirms the creation
- Then a new user account SHALL be created with the provided information
- And the modal SHALL close
- And the new user SHALL appear in the user table

#### Scenario: Create user with role selection

- Given the create user modal is open
- When the admin selects a role from the role dropdown
- Then the available options SHALL include admin and regular user roles

#### Scenario: Cancel user creation

- Given the create user modal is open
- When the admin cancels the operation
- Then the modal SHALL close
- And no new user SHALL be created

### Requirement: Edit User

The admin SHALL be able to edit existing user accounts through a modal dialog with fields for modifiable user properties.

#### Scenario: Open edit user modal

- Given the admin is on the user management page
- When the admin activates the edit action for a specific user
- Then a modal dialog SHALL appear pre-populated with the user's current first name, last name, role, and active status

#### Scenario: Edit user name

- Given the edit user modal is open
- And the admin has modified the first name or last name
- When the admin confirms the changes
- Then the user's name SHALL be updated
- And the user table SHALL reflect the updated name

#### Scenario: Edit user role

- Given the edit user modal is open
- When the admin selects a different role from the role dropdown
- And the admin confirms the changes
- Then the user's role SHALL be updated
- And the role badge in the table SHALL update accordingly

#### Scenario: Toggle user active status

- Given the edit user modal is open
- When the admin toggles the active status
- And the admin confirms the changes
- Then the user's active status SHALL be updated
- And the status badge in the table SHALL update accordingly

#### Scenario: Cancel user edit

- Given the edit user modal is open
- When the admin cancels the operation
- Then the modal SHALL close
- And no changes SHALL be applied to the user

### Requirement: Delete User

The admin SHALL be able to delete user accounts with a confirmation step to prevent accidental deletions.

#### Scenario: Initiate user deletion

- Given the admin is on the user management page
- When the admin activates the delete action for a specific user
- Then a confirmation modal SHALL appear asking the admin to confirm the deletion

#### Scenario: Confirm user deletion

- Given the deletion confirmation modal is displayed
- When the admin confirms the deletion
- Then the user account SHALL be deleted
- And the user SHALL be removed from the user table
- And the statistics cards SHALL update to reflect the removal

#### Scenario: Cancel user deletion

- Given the deletion confirmation modal is displayed
- When the admin cancels the deletion
- Then the modal SHALL close
- And the user account SHALL remain unchanged

### Requirement: Localized User Interface

Every user-facing string rendered by the `/admin/users` page (page header and description, statistics card labels, search placeholder, primary action button, table headers, action tooltips, empty state, modal titles and bodies, form field labels, role and status badges, confirmation messages) SHALL be sourced from the translation catalogue. No strings SHALL be hardcoded English.

#### Scenario: Switching language updates the entire admin page

- GIVEN an admin is viewing `/admin/users` in English
- WHEN the admin switches the active language to Spanish
- THEN every string visible on the page SHALL update to its Spanish translation
- AND no English text SHALL remain, including modal titles, form field labels, and confirmation text

#### Scenario: Role and status badges are translated

- GIVEN the admin table renders a row with role "admin" and status "active"
- WHEN the active language is Spanish
- THEN the role badge SHALL display the Spanish translation for "Admin"
- AND the status badge SHALL display the Spanish translation for "Active"

#### Scenario: Modal field labels are translated

- GIVEN an admin opens the Create User or Edit User modal
- WHEN the active language is Spanish
- THEN the field labels (email, first name, last name, role, password, confirm password, active user) SHALL render in Spanish
- AND the submit and cancel buttons SHALL render in Spanish

### Requirement: Admins SHALL be able to reset any user's password from the admin user list

Each row in `/admin/users` SHALL include a "Reset password" action button alongside the existing Edit and Delete buttons. Clicking it SHALL open a modal with two inputs: `new_password` and `new_password_confirm`.

The modal SHALL submit to `POST /api/users/<id>/set_password/`. Client-side validation matches the `/profile` form (non-empty, ≥ 8 characters, two values match). Server-side errors SHALL be mapped to the matching input.

On HTTP 200 the modal SHALL close and a "Password reset" toast SHALL be visible for at least 3 seconds. The new password SHALL NOT be echoed back in any persistent surface (no toast text, no inline confirmation, no row-level annotation) — the admin just typed it; re-displaying it creates a screen-recording risk.

#### Scenario: Admin resets a user's password

- GIVEN admin Alice is logged in
- AND user Bob exists in the admin user list
- WHEN Alice opens Bob's "Reset password" modal, fills both inputs with `NewPass456!`, and submits
- THEN the response SHALL be HTTP 200
- AND a "Password reset" toast SHALL appear
- AND the modal SHALL close
- AND the new password SHALL NOT appear anywhere on the page text

#### Scenario: Mismatched passwords surface inline

- WHEN Alice clicks Reset with `new_password = 'NewPass456!'` and `new_password_confirm = 'TypoPass456!'`
- THEN the request SHALL NOT be sent to the server
- AND the Confirm input SHALL show a "Passwords do not match" error

#### Scenario: The Reset password button is admin-only

- GIVEN user Bob is a non-admin
- WHEN Bob navigates to the admin user list URL
- THEN the existing `withAdmin` HOC SHALL redirect Bob away
- AND the Reset password button is therefore unreachable for non-admin users

### Requirement: `/admin/users` SHALL render filter controls that round-trip to the backend

The toolbar SHALL include three filter controls: role (all / admin / user), status (all / active / inactive), and last-login (any / within 7 days / within 30 days / within 90 days / never).

Changing any filter SHALL trigger a list refetch with the corresponding query params (`role`, `is_active`, `last_login_within_days`, or `last_login_never`). The table SHALL render only the rows the backend returns; no client-side post-filtering is applied for these dimensions.

A free-text search box remains client-side and matches against `email`, `first_name`, and `last_name`.

#### Scenario: Selecting "Admin" in the role filter refetches the list

- GIVEN the admin users page is loaded
- WHEN the admin selects "Admin" in the role filter
- THEN the list SHALL refetch with `?role=admin`
- AND only admin rows SHALL render in the table

### Requirement: `/admin/users` SHALL support bulk select and a bulk action bar

Each row SHALL include a select checkbox; the table header SHALL include a "select all on page" checkbox. The requester's own row SHALL NOT be selectable (the checkbox SHALL be disabled).

When at least one row is selected, a contextual action bar SHALL render above the table with: Activate, Deactivate, Promote, Demote, Delete, and a "Clear" button. The bar SHALL display the count of selected rows.

The Delete button SHALL be disabled when any selected row has `is_active=true`, with a tooltip explaining the constraint. Each action button SHALL post the selected ids to its corresponding bulk endpoint and refetch the list on success.

When the active filter set or the search term changes, ids that are no longer in the visible set SHALL be removed from the selection.

#### Scenario: Bulk action bar appears when any row is selected

- WHEN the admin checks the row-level checkbox for any user
- THEN the bulk action bar SHALL be visible
- AND it SHALL display "1 selected"

#### Scenario: Bulk delete is disabled while any selected user is active

- GIVEN the admin selects one active user and one inactive user
- WHEN inspecting the bulk action bar
- THEN the Delete button SHALL be disabled

### Requirement: `/admin/users` SHALL provide per-row state actions with a confirm modal

Each row SHALL expose icon buttons for: Edit, Reset password, Activate / Deactivate (mutually exclusive based on `is_active`), Promote / Demote (mutually exclusive based on `role`), and Delete. The Delete button SHALL be disabled while the row is active.

Clicking any of Activate / Deactivate / Promote / Demote SHALL open a shared confirmation modal showing the action verb and the target user's name. Confirming SHALL POST to the matching `/api/users/<id>/<action>/` endpoint and refetch the list on success.

The requester's own row SHALL hide / disable these destructive actions on themselves.

#### Scenario: Per-row deactivate goes through the confirmation flow

- WHEN the admin clicks the deactivate icon on Bob's row
- THEN a confirmation modal SHALL appear with Bob's name
- WHEN the admin confirms
- THEN the page SHALL POST `/api/users/<bob_id>/deactivate/` and refetch the list
- AND Bob's row SHALL render as Inactive afterwards

#### Scenario: Promote replaces with Demote after the role flips

- GIVEN Bob is currently a regular user
- WHEN the admin promotes Bob and the list refetches
- THEN Bob's row SHALL no longer display the Promote icon
- AND Bob's row SHALL display the Demote icon

### Requirement: The delete modal SHALL display a deletion-impact summary

When the admin opens the delete confirmation modal for a user, the page SHALL fetch `GET /api/users/<id>/deletion_impact/` and display the returned counts:

- "{N} notifications will be discarded." when `notifications > 0`.
- "{M} audit-log entries will be anonymized…" when `audit_log_entries > 0`.
- A "no related data" line when both are zero.

Failing to fetch the impact SHALL NOT block the modal — the admin can still proceed; the breakdown is merely omitted.

#### Scenario: Modal renders the impact summary

- GIVEN the deletion-impact endpoint returns `{"notifications": 3, "audit_log_entries": 7}`
- WHEN the admin opens the delete modal for that user
- THEN the modal SHALL display "3 notifications will be discarded."
- AND the modal SHALL display "7 audit-log entries will be anonymized…"

### Requirement: The reset-password modal SHALL render a strength meter

The admin reset-password modal SHALL render the same advisory password-strength meter as `/profile` beneath its New password input. The scoring rules and labels SHALL match `password.strength.*` (see the auth spec). The meter SHALL be hidden on empty input and SHALL NOT block submission.

#### Scenario: Meter renders inside the reset modal

- GIVEN the admin opens the reset-password modal for a user
- WHEN the admin types into the New password input
- THEN the strength meter SHALL render below the input
- AND its severity label SHALL update as the input value changes
