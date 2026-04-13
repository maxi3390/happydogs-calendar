# Settings and Translations Specification

## Purpose

This specification defines the behavior of the nursery settings and translation domains within the pet nursery management system. Settings provide a singleton configuration for nursery-wide parameters such as daily booking limits. The translation system serves localized content for supported languages, enabling the application to present its interface in multiple languages.

## Requirements

### Requirement: Retrieve Nursery Settings

The system SHALL provide an endpoint to retrieve the current nursery settings.

The response MUST include the `daily_booking_limit` value.

Only one settings instance SHALL exist in the system at any time (singleton).

The endpoint MUST require authentication.

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

#### Scenario: Unauthenticated request to retrieve settings

- Given no authentication credentials are provided
- When a request is made to retrieve the nursery settings
- Then the system SHALL reject the request with an authentication error

### Requirement: Update Nursery Settings

The system SHALL provide an endpoint to update the nursery settings.

The system MUST allow updating the `daily_booking_limit`.

When `daily_booking_limit` is set to 0, the system SHALL interpret this as unlimited (no booking limit enforced).

Only one settings instance SHALL exist; updates MUST modify the existing singleton rather than creating additional instances.

The endpoint MUST require authentication.

> **Note:** The settings update endpoint currently lacks fine-grained permission protection. This endpoint SHOULD be restricted to administrator-level users only in a future revision.

#### Scenario: Successfully updating the daily booking limit

- Given an authenticated user exists
- And nursery settings exist with a daily_booking_limit of 10
- When the user submits a request to update the daily_booking_limit to 25
- Then the system SHALL persist the change
- And subsequent retrieval of settings SHALL return daily_booking_limit equal to 25

#### Scenario: Setting daily booking limit to zero (unlimited)

- Given an authenticated user exists
- And nursery settings exist with a daily_booking_limit of 15
- When the user submits a request to update the daily_booking_limit to 0
- Then the system SHALL persist the change
- And the daily_booking_limit SHALL be stored as 0, representing unlimited bookings

#### Scenario: Settings remain a singleton after update

- Given an authenticated user exists
- And nursery settings exist
- When the user updates the settings multiple times
- Then only one settings instance SHALL exist in the system at any time
- And each update SHALL modify the same instance

#### Scenario: Unauthenticated request to update settings

- Given no authentication credentials are provided
- When a request is made to update the nursery settings
- Then the system SHALL reject the request with an authentication error

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

> **Note:** This requirement documents a known gap. The settings endpoints currently do not enforce administrator-level permissions.

The settings retrieval and update endpoints SHOULD restrict access to administrator-level users only.

Any non-administrator authenticated user SHOULD be denied access to modify settings.

#### Scenario: Non-administrator attempts to update settings (desired behavior)

- Given an authenticated user exists who is not an administrator
- When the user submits a request to update the nursery settings
- Then the system SHOULD reject the request with a permission denied error

#### Scenario: Administrator successfully updates settings (desired behavior)

- Given an authenticated administrator user exists
- When the administrator submits a request to update the nursery settings
- Then the system SHOULD accept the request and persist the changes
