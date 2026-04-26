# MODIFIED: Frontend / Auth

## ADDED Requirements

### Requirement: User shape SHALL carry `language`

The frontend `User` type SHALL include a `language` field (`'en' | 'es'`). The login, register, and `/api/auth/me` response handlers SHALL persist that field into the auth context and `localStorage` (`auth_user` key) so it survives page reloads without a refetch.

#### Scenario: User shape after login

- GIVEN the backend login response includes `user.language = "en"`
- WHEN the auth provider stores the response
- THEN `useAuth().user.language` SHALL be `"en"`
- AND `localStorage.auth_user` SHALL include `"language":"en"`
