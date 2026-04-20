# Delta for Backend Auth

## MODIFIED Requirements

### Requirement: Profile Update Ignores Email Field

The profile update endpoint SHALL ignore any `email` field in the request body and only update `first_name` and `last_name`.

#### Scenario: Email change attempt is ignored

- GIVEN an authenticated user with email `alice@example.com`
- WHEN the user PATCHes the profile endpoint with `{"email": "new@example.com", "first_name": "Alicia"}`
- THEN the system SHALL update `first_name` to "Alicia"
- AND the email SHALL remain `alice@example.com`

### Requirement: Blacklisted Refresh Token Is Rejected

After a refresh token has been rotated (blacklisted), subsequent refresh attempts using the old token SHALL be rejected.

#### Scenario: Old refresh token rejected after rotation

- GIVEN a user has refreshed their tokens once (causing the original refresh token to be blacklisted)
- WHEN a subsequent refresh request is made using the original (now blacklisted) refresh token
- THEN the system SHALL reject the request with a 401 authentication error
