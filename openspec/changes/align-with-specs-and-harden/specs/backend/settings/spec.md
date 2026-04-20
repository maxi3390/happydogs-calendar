# Delta for Backend Settings

## MODIFIED Requirements

### Requirement: Retrieve Nursery Settings

The GET settings endpoint SHALL be publicly accessible without authentication so that the login page can fetch the custom system logo before the user authenticates.

#### Scenario: Unauthenticated request to GET settings succeeds

- GIVEN no authentication credentials are provided
- WHEN a GET request is made to the nursery settings endpoint
- THEN the system SHALL return the current settings (including `logo_url` and `daily_booking_limit`)

### Requirement: Update Nursery Settings Requires Admin

The settings update endpoint SHALL require the authenticated user to have the admin role.

#### Scenario: Non-admin user rejected

- GIVEN an authenticated user with the `user` role
- WHEN the user submits a PATCH or PUT request to the settings update endpoint
- THEN the system SHALL reject the request with a 403 permission error

#### Scenario: Admin user accepted

- GIVEN an authenticated user with the `admin` role
- WHEN the admin submits a PATCH or PUT request to the settings update endpoint with valid data
- THEN the system SHALL persist the change and return the updated settings

### Requirement: System Logo Upload Requires Admin

The logo upload endpoint SHALL require the authenticated user to have the admin role.

#### Scenario: Non-admin cannot upload logo

- GIVEN an authenticated non-admin user
- WHEN the user POSTs a multipart logo file to the upload endpoint
- THEN the system SHALL reject the request with a 403 permission error

### Requirement: System Logo Deletion Requires Admin

The logo delete endpoint SHALL require the authenticated user to have the admin role.

#### Scenario: Non-admin cannot delete logo

- GIVEN an authenticated non-admin user
- WHEN the user sends a DELETE request to the logo delete endpoint
- THEN the system SHALL reject the request with a 403 permission error
