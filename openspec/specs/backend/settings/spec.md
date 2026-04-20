# Settings and Translations Specification

## Purpose

This specification defines the behavior of the nursery settings and translation domains within the pet nursery management system. Settings provide a singleton configuration for nursery-wide parameters such as daily booking limits. The translation system serves localized content for supported languages, enabling the application to present its interface in multiple languages.

## Requirements

### Requirement: Retrieve Nursery Settings

The system SHALL provide an endpoint to retrieve the current nursery settings.

The response MUST include the `daily_booking_limit` value and the `logo_url` field (null when no logo is configured).

Only one settings instance SHALL exist in the system at any time (singleton).

`GET /api/settings/` SHALL be publicly accessible (AllowAny) without authentication. This is an intentional exception to the general authentication requirement: the login page needs to fetch the custom logo before the user has logged in. No other settings endpoint is public — all write operations require the administrator role (see Requirement: Permission Protection for Settings Endpoints).

#### Scenario: Successfully retrieving nursery settings

- Given an authenticated user exists
- And nursery settings have been configured with a daily_booking_limit of 20
- When the user requests the nursery settings
- Then the system SHALL return the settings with daily_booking_limit equal to 20

#### Scenario: Retrieving settings when they have not been explicitly configured

- Given an authenticated user exists
- And no explicit settings configuration has been performed
- When the user requests the nursery settings
- Then the system SHALL return a default settings instance with sensible default values

#### Scenario: Unauthenticated request to retrieve settings succeeds

- Given no authentication credentials are provided
- When a request is made to `GET /api/settings/`
- Then the system SHALL return the settings successfully (HTTP 200)
- And the response SHALL include `daily_booking_limit` and `logo_url`
- And no authentication error SHALL be returned, because this endpoint is intentionally public to allow the login page to render the custom logo before login

### Requirement: Update Nursery Settings

The system SHALL provide an endpoint to update the nursery settings (`PATCH /api/settings/update/` and `PUT /api/settings/update/`).

The system MUST allow updating the `daily_booking_limit`.

When `daily_booking_limit` is set to 0, the system SHALL interpret this as unlimited (no booking limit enforced).

Only one settings instance SHALL exist; updates MUST modify the existing singleton rather than creating additional instances.

The endpoint MUST require the authenticated user to have the `admin` role. Unauthenticated requests SHALL be rejected with an authentication error (HTTP 401). Authenticated requests from non-admin users SHALL be rejected with a permission-denied error (HTTP 403).

#### Scenario: Admin successfully updates the daily booking limit

- Given an authenticated administrator user exists
- And nursery settings exist with a daily_booking_limit of 10
- When the administrator submits a request to update the daily_booking_limit to 25
- Then the system SHALL persist the change
- And subsequent retrieval of settings SHALL return daily_booking_limit equal to 25

#### Scenario: Admin sets daily booking limit to zero (unlimited)

- Given an authenticated administrator user exists
- And nursery settings exist with a daily_booking_limit of 15
- When the administrator submits a request to update the daily_booking_limit to 0
- Then the system SHALL persist the change
- And the daily_booking_limit SHALL be stored as 0, representing unlimited bookings

#### Scenario: Settings remain a singleton after update

- Given an authenticated administrator user exists
- And nursery settings exist
- When the administrator updates the settings multiple times
- Then only one settings instance SHALL exist in the system at any time
- And each update SHALL modify the same instance

#### Scenario: Non-admin authenticated user is rejected when updating settings

- Given an authenticated user exists whose role is NOT `admin`
- When the user submits a request to update the nursery settings
- Then the system SHALL reject the request with a permission-denied error (HTTP 403)
- And no settings fields SHALL be modified

#### Scenario: Unauthenticated request to update settings is rejected

- Given no authentication credentials are provided
- When a request is made to update the nursery settings
- Then the system SHALL reject the request with an authentication error (HTTP 401)

### Requirement: Serve Translations for Supported Languages

The system SHALL provide an endpoint to retrieve translation content for a specified language.

The translation content SHALL be served as a JSON structure.

The system MUST support English (language code: `en`) and Spanish (language code: `es`).

Translation endpoints SHALL be publicly accessible without authentication.

#### Scenario: Retrieving English translations

- Given the system has English translation content available
- When a request is made to retrieve translations for language code "en"
- Then the system SHALL return the English translation content as a JSON structure

#### Scenario: Retrieving Spanish translations

- Given the system has Spanish translation content available
- When a request is made to retrieve translations for language code "es"
- Then the system SHALL return the Spanish translation content as a JSON structure

#### Scenario: Requesting translations for an unsupported language

- Given the system supports only "en" and "es"
- When a request is made to retrieve translations for language code "fr"
- Then the system SHALL respond with a not-found error or an appropriate error indicating the language is not supported

#### Scenario: Translation endpoints do not require authentication

- Given no authentication credentials are provided
- When a request is made to retrieve translations for language code "en"
- Then the system SHALL return the translation content successfully without requiring authentication

### Requirement: Default Language Endpoint

The system SHALL provide an endpoint to retrieve translations for the default language.

The default language MUST be English (language code: `en`).

This endpoint SHALL be publicly accessible without authentication.

#### Scenario: Retrieving default language translations

- When a request is made to the default language translations endpoint
- Then the system SHALL return the English translation content

#### Scenario: Default language endpoint does not require authentication

- Given no authentication credentials are provided
- When a request is made to the default language translations endpoint
- Then the system SHALL return the translation content successfully without requiring authentication

### Requirement: List Available Languages

The system SHALL provide an endpoint to retrieve the list of available languages.

Each entry in the list MUST include the language code and a human-readable label.

The list MUST include at least English and Spanish.

This endpoint SHALL be publicly accessible without authentication.

#### Scenario: Retrieving the list of available languages

- When a request is made to retrieve the available languages
- Then the system SHALL return a list containing at least two entries
- And the list SHALL include an entry with code "en" and a corresponding label
- And the list SHALL include an entry with code "es" and a corresponding label

#### Scenario: Available languages endpoint does not require authentication

- Given no authentication credentials are provided
- When a request is made to retrieve the available languages
- Then the system SHALL return the list of languages successfully without requiring authentication

### Requirement: Permission Protection for Settings Endpoints

Settings write endpoints are restricted to administrator-level users. Any authenticated user without the `admin` role SHALL be denied access to modify settings. The system enforces this via DRF permission classes on the affected endpoints.

Concretely:

- `PATCH /api/settings/update/` — IS restricted: requires `admin` role.
- `PUT /api/settings/update/` — IS restricted: requires `admin` role.
- `POST /api/settings/upload_logo/` — IS restricted: requires `admin` role.
- `DELETE /api/settings/delete_logo/` — IS restricted: requires `admin` role.
- `GET /api/settings/` — IS INTENTIONALLY PUBLIC (AllowAny). This is a deliberate exception, not an oversight. The login page needs to fetch the custom system logo before the user has authenticated; restricting the GET endpoint would prevent the logo from rendering on the login screen. No sensitive data is exposed by this endpoint (it returns only `daily_booking_limit` and `logo_url`).

Unauthenticated requests to restricted endpoints SHALL receive HTTP 401. Authenticated requests from non-admin users to restricted endpoints SHALL receive HTTP 403.

#### Scenario: Administrator updates settings

- Given an authenticated user with role `admin`
- When the administrator submits a PATCH request to `/api/settings/update/` with a new `daily_booking_limit`
- Then the system SHALL accept the request (HTTP 200)
- And the change SHALL be persisted

#### Scenario: Administrator uploads a logo

- Given an authenticated user with role `admin`
- When the administrator submits a multipart POST to `/api/settings/upload_logo/` with a valid image
- Then the system SHALL accept the request and store the logo

#### Scenario: Administrator deletes the logo

- Given an authenticated user with role `admin`
- And a logo currently exists
- When the administrator submits a DELETE request to `/api/settings/delete_logo/`
- Then the system SHALL accept the request and remove the logo

#### Scenario: Non-admin user is rejected when updating settings

- Given an authenticated user whose role is NOT `admin`
- When the user submits a PATCH request to `/api/settings/update/`
- Then the system SHALL reject the request with HTTP 403
- And no settings fields SHALL be modified

#### Scenario: Non-admin user is rejected when uploading a logo

- Given an authenticated user whose role is NOT `admin`
- When the user submits a POST request to `/api/settings/upload_logo/`
- Then the system SHALL reject the request with HTTP 403
- And no logo file SHALL be stored

#### Scenario: Non-admin user is rejected when deleting the logo

- Given an authenticated user whose role is NOT `admin`
- When the user submits a DELETE request to `/api/settings/delete_logo/`
- Then the system SHALL reject the request with HTTP 403
- And the existing logo (if any) SHALL remain in place

#### Scenario: Public GET endpoint remains accessible without authentication

- Given no authentication credentials are provided
- When a request is made to `GET /api/settings/`
- Then the system SHALL return HTTP 200 with the settings payload
- And this exception is deliberate so the login page can display the custom logo before login

### Requirement: System Logo Storage

The system SHALL support storing a single logo image as part of the nursery-wide settings. The logo is used for branding on the login page and navigation bar.

#### Scenario: Upload a logo image

- GIVEN an authenticated user sends a multipart request with a valid image file to the upload logo endpoint
- WHEN the upload is processed
- THEN the system SHALL store the image and return the updated settings including a logo_url field

#### Scenario: Upload replaces existing logo

- GIVEN a logo image already exists in settings
- WHEN a new logo image is uploaded
- THEN the system SHALL delete the previous file and store the new one

#### Scenario: Reject oversized logo

- GIVEN a user uploads an image larger than 5 MB
- WHEN the upload is processed
- THEN the system SHALL reject the request with a validation error

#### Scenario: Reject unsupported format

- GIVEN a user uploads a non-image file
- WHEN the upload is processed
- THEN the system SHALL reject the request with a validation error
- AND only JPEG, PNG, GIF, and WEBP SHALL be accepted

#### Scenario: Upload with no file

- GIVEN an authenticated user sends a request to the upload endpoint without a file
- WHEN the request is processed
- THEN the system SHALL return a 400 error

### Requirement: System Logo Retrieval

The settings GET endpoint SHALL include the logo URL when a logo is set.

#### Scenario: Settings response with logo

- GIVEN a logo has been uploaded
- WHEN the settings endpoint is queried
- THEN the response SHALL include a logo_url field with an accessible URL

#### Scenario: Settings response without logo

- GIVEN no logo has been uploaded
- WHEN the settings endpoint is queried
- THEN the logo_url field SHALL be null

### Requirement: System Logo Deletion

The system SHALL allow removing the current logo via a dedicated DELETE endpoint.

#### Scenario: Delete existing logo

- GIVEN a logo image exists
- WHEN the delete logo endpoint is called
- THEN the system SHALL remove the file and return a 204 response
- AND subsequent settings queries SHALL return null for logo_url

#### Scenario: Delete when no logo exists

- GIVEN no logo is set
- WHEN the delete logo endpoint is called
- THEN the system SHALL return a 204 response without error

### Requirement: Logo Singleton Integrity

The logo SHALL be preserved when other nursery settings fields are updated.

#### Scenario: Updating booking limit does not affect logo

- GIVEN a logo has been uploaded
- WHEN the daily booking limit is updated via PATCH
- THEN the logo SHALL remain unchanged
- AND the settings response SHALL still include the logo URL
