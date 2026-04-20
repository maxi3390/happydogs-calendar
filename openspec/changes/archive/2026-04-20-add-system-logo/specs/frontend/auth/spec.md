# Delta for Frontend Auth

## MODIFIED Requirements

### Requirement: Login Page Branding

The login page SHALL display the system logo when one has been configured.

#### Scenario: Custom logo on login page

- GIVEN a custom logo has been uploaded via settings
- WHEN the login page loads
- THEN the system SHALL display the custom logo image instead of the default icon

#### Scenario: Default icon on login page

- GIVEN no custom logo has been configured
- WHEN the login page loads
- THEN the system SHALL display the default application icon
