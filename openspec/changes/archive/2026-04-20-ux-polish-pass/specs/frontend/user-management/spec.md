# Delta for Frontend User Management

## ADDED Requirements

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
