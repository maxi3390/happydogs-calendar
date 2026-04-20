# Delta for Frontend Auth

## MODIFIED Requirements

### Requirement: Login Page Renders Without Errors

The login page SHALL render without JavaScript runtime errors regardless of whether a custom system logo has been configured.

#### Scenario: Login page with no logo configured

- GIVEN no custom logo has been uploaded to the system
- WHEN an unauthenticated user navigates to the login page
- THEN the page SHALL render successfully with the default LogIn icon
- AND no undefined-variable errors SHALL occur

#### Scenario: Login page with custom logo

- GIVEN a custom logo has been uploaded
- WHEN an unauthenticated user navigates to the login page
- THEN the page SHALL render successfully with the custom logo displayed
