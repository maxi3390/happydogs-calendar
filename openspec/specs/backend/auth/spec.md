# Authentication and Authorization Specification

## Purpose

This specification defines the authentication and authorization behavior for the pet nursery management system backend. It covers user registration, login, logout, token management, profile operations, password management, and role-based access control. Authentication is email-based and uses JWT tokens.

## Requirements

### Requirement: User Registration

The system SHALL allow new users to register by providing an email address, password, password confirmation, first name, and last name. The email address SHALL serve as the sole identifier for authentication; no username field is used. The system MUST validate that the password confirmation matches the password. The password MUST pass strength validation rules. The email MUST be unique across all registered users. Upon successful registration, the system SHALL return the created user profile.

#### Scenario: Successful Registration

- Given a visitor provides a valid email, a strong password, a matching password confirmation, a first name, and a last name
- When the visitor submits the registration request
- Then the system SHALL create a new user account
- And the system SHALL return the user profile containing the email, first name, and last name

#### Scenario: Registration With Mismatched Password Confirmation

- Given a visitor provides a password and a password confirmation that do not match
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error indicating the passwords do not match
- And no user account SHALL be created

#### Scenario: Registration With Weak Password

- Given a visitor provides a password that does not meet strength validation requirements
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error describing the password weakness
- And no user account SHALL be created

#### Scenario: Registration With Duplicate Email

- Given a user account already exists with a given email address
- When a visitor attempts to register with the same email address
- Then the system SHALL reject the request with a validation error indicating the email is already in use
- And no duplicate user account SHALL be created

#### Scenario: Registration With Missing Required Fields

- Given a visitor omits one or more required fields (email, password, password confirmation, first name, or last name)
- When the visitor submits the registration request
- Then the system SHALL reject the request with a validation error identifying the missing fields

### Requirement: User Login

The system SHALL allow registered users to log in by providing their email and password. Upon successful authentication, the system SHALL return the user profile along with an access token and a refresh token. The access token SHALL expire after 60 minutes. The refresh token SHALL expire after 7 days.

#### Scenario: Successful Login

- Given a registered user provides a valid email and correct password
- When the user submits the login request
- Then the system SHALL authenticate the user
- And the system SHALL return the user profile (email, first name, last name, role)
- And the system SHALL return an access token with a 60-minute expiration
- And the system SHALL return a refresh token with a 7-day expiration

#### Scenario: Login With Invalid Credentials

- Given a visitor provides an incorrect email or password
- When the visitor submits the login request
- Then the system SHALL reject the request with an authentication error
- And no tokens SHALL be issued

#### Scenario: Login With Non-Existent Email

- Given a visitor provides an email that is not associated with any registered account
- When the visitor submits the login request
- Then the system SHALL reject the request with an authentication error
- And the error message SHOULD NOT reveal whether the email exists in the system

### Requirement: Token Refresh and Rotation

The system SHALL allow users to obtain a new access token by presenting a valid refresh token. Upon successful token refresh, the system SHALL issue a new access token and a new refresh token. The previously used refresh token MUST be blacklisted immediately after use to prevent reuse (token rotation).

#### Scenario: Successful Token Refresh

- Given a user presents a valid, non-blacklisted refresh token
- When the user submits the token refresh request
- Then the system SHALL return a new access token
- And the system SHALL return a new refresh token
- And the system SHALL blacklist the previously used refresh token

#### Scenario: Token Refresh With Blacklisted Token

- Given a user presents a refresh token that has already been blacklisted
- When the user submits the token refresh request
- Then the system SHALL reject the request with an authentication error
- And no new tokens SHALL be issued

#### Scenario: Token Refresh With Expired Token

- Given a user presents a refresh token that has exceeded its 7-day expiration
- When the user submits the token refresh request
- Then the system SHALL reject the request with an authentication error
- And no new tokens SHALL be issued

### Requirement: User Logout

The system SHALL allow authenticated users to log out by presenting their refresh token. Upon successful logout, the system MUST blacklist the provided refresh token so that it can no longer be used for token refresh.

#### Scenario: Successful Logout

- Given an authenticated user provides a valid refresh token
- When the user submits the logout request
- Then the system SHALL blacklist the provided refresh token
- And the system SHALL confirm the logout was successful

#### Scenario: Logout With Invalid Refresh Token

- Given a user provides an invalid or already-blacklisted refresh token
- When the user submits the logout request
- Then the system SHALL reject the request with an error

### Requirement: Profile Viewing

The system SHALL allow authenticated users to view their own profile. The profile SHALL include the user's email, first name, last name, and role.

#### Scenario: View Own Profile

- Given an authenticated user requests their profile
- When the system processes the request
- Then the system SHALL return the user's email, first name, last name, and role

#### Scenario: View Profile Without Authentication

- Given an unauthenticated visitor requests a user profile
- When the system processes the request
- Then the system SHALL reject the request with an authentication error

### Requirement: Profile Updating

The system SHALL allow authenticated users to update their own profile. Users SHALL be able to update their first name and last name only. The email address MUST NOT be changeable through the profile update endpoint.

#### Scenario: Update Own Name

- Given an authenticated user provides a new first name and/or last name
- When the user submits the profile update request
- Then the system SHALL update the user's name fields
- And the system SHALL return the updated user profile

#### Scenario: Attempt To Change Email Via Profile Update

- Given an authenticated user attempts to change their email address through the profile update endpoint
- When the user submits the profile update request
- Then the system SHALL NOT modify the email address
- And the system SHALL ignore the email field in the update payload

### Requirement: Password Change

The system SHALL allow authenticated users to change their password. The user MUST provide their current (old) password along with the new password. The system MUST validate that the old password is correct before accepting the change. The new password MUST pass strength validation rules.

#### Scenario: Successful Password Change

- Given an authenticated user provides their correct current password and a valid new password
- When the user submits the password change request
- Then the system SHALL update the user's password
- And the system SHALL confirm the password was changed successfully

#### Scenario: Password Change With Incorrect Old Password

- Given an authenticated user provides an incorrect current password
- When the user submits the password change request
- Then the system SHALL reject the request with a validation error indicating the old password is incorrect
- And the password SHALL NOT be changed

#### Scenario: Password Change With Weak New Password

- Given an authenticated user provides a correct current password but a new password that does not meet strength requirements
- When the user submits the password change request
- Then the system SHALL reject the request with a validation error describing the password weakness
- And the password SHALL NOT be changed

### Requirement: Role-Based Access Control

The system SHALL support two roles: admin and user. Each user MUST have exactly one role. New users created through registration SHALL be assigned the user role by default. The system SHALL enforce role-based access to endpoints using custom permission rules.

#### Scenario: Default Role Assignment on Registration

- Given a visitor registers a new account
- When the account is created
- Then the system SHALL assign the user role to the new account

#### Scenario: Admin Accessing Admin-Only Endpoint

- Given an authenticated user with the admin role
- When the user accesses an admin-only endpoint
- Then the system SHALL allow access

#### Scenario: Non-Admin Accessing Admin-Only Endpoint

- Given an authenticated user with the user role
- When the user accesses an admin-only endpoint
- Then the system SHALL deny access with a permission error

### Requirement: Admin User Management

The system SHALL provide admin-only endpoints for managing users. Admin users SHALL be able to list all users, view any user's details, update any user's profile, and delete users. These endpoints MUST be restricted to users with the admin role.

#### Scenario: Admin Lists All Users

- Given an authenticated admin user
- When the admin requests the list of all users
- Then the system SHALL return a list of all registered user profiles

#### Scenario: Admin Views Another User's Profile

- Given an authenticated admin user
- When the admin requests the profile of any specific user
- Then the system SHALL return that user's full profile

#### Scenario: Admin Deletes A User

- Given an authenticated admin user
- When the admin requests deletion of a specific user
- Then the system SHALL delete that user account
- And the system SHALL confirm the deletion

#### Scenario: Non-Admin Attempts User Management

- Given an authenticated user with the user role
- When the user attempts to access any user management endpoint
- Then the system SHALL deny access with a permission error

### Requirement: Superuser Creation

The system SHALL provide a mechanism to create superuser accounts. Superuser creation MUST enforce that the created account has the admin role, regardless of any other input.

#### Scenario: Superuser Is Created With Admin Role

- Given an operator creates a superuser account
- When the superuser account is created
- Then the system SHALL assign the admin role to the account
- And this role assignment MUST NOT be overridable during creation

### Requirement: Custom Permission Rules

The system SHALL define the following permission rules for use across all endpoints:

- **IsAdmin**: Only users with the admin role SHALL be granted access.
- **IsAdminOrReadOnly**: Users with the admin role SHALL have full access; all other authenticated users SHALL have read-only access.
- **IsOwnerOrAdmin**: The resource owner or any user with the admin role SHALL be granted access; other users SHALL be denied.
- **IsAuthenticated**: Any authenticated user SHALL be granted access regardless of role.

The default permission for all API endpoints SHALL be open (allow any), with specific permissions overridden on a per-endpoint basis.

#### Scenario: IsAdmin Grants Access to Admin

- Given an authenticated user with the admin role
- When the user accesses an endpoint protected by the IsAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsAdmin Denies Access to Non-Admin

- Given an authenticated user with the user role
- When the user accesses an endpoint protected by the IsAdmin rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsAdminOrReadOnly Allows Admin Full Access

- Given an authenticated user with the admin role
- When the user performs any operation (read or write) on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL allow the request

#### Scenario: IsAdminOrReadOnly Allows Non-Admin Read Access

- Given an authenticated user with the user role
- When the user performs a read operation on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL allow the request

#### Scenario: IsAdminOrReadOnly Denies Non-Admin Write Access

- Given an authenticated user with the user role
- When the user performs a write operation (create, update, delete) on an endpoint protected by the IsAdminOrReadOnly rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsOwnerOrAdmin Allows Resource Owner Access

- Given an authenticated user who owns the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsOwnerOrAdmin Allows Admin Access to Any Resource

- Given an authenticated user with the admin role who does not own the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL allow the request

#### Scenario: IsOwnerOrAdmin Denies Non-Owner Non-Admin Access

- Given an authenticated user with the user role who does not own the requested resource
- When the user accesses an endpoint protected by the IsOwnerOrAdmin rule
- Then the system SHALL deny the request with a permission error

#### Scenario: IsAuthenticated Allows Any Authenticated User

- Given any authenticated user regardless of role
- When the user accesses an endpoint protected by the IsAuthenticated rule
- Then the system SHALL allow the request

#### Scenario: Unauthenticated Request to Protected Endpoint

- Given an unauthenticated visitor
- When the visitor accesses any endpoint protected by any permission rule
- Then the system SHALL deny the request with an authentication error
