# MODIFIED: Backend / Auth

## ADDED Requirements

### Requirement: API SHALL default to authenticated access

The DRF global `DEFAULT_PERMISSION_CLASSES` SHALL be `IsAuthenticated`, so any
endpoint that does not explicitly declare its permission classes is closed to
anonymous callers by default.

Endpoints that are intentionally public SHALL opt in explicitly with
`AllowAny`. The complete set of public endpoints SHALL be limited to:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/token/refresh/`
- the translations and available-languages endpoints
- the read-only nursery-settings / system-logo endpoint used by the login page

Any other endpoint SHALL require a valid JWT.

#### Scenario: New endpoint without explicit permission is not public

- GIVEN a newly added viewset that omits `permission_classes`
- WHEN an unauthenticated client calls it
- THEN the API SHALL respond `401 Unauthorized`

#### Scenario: Documented public endpoints remain reachable anonymously

- GIVEN no authentication credentials
- WHEN a client calls `POST /api/auth/login/` or the translations endpoint
- THEN the API SHALL NOT reject the request for lack of authentication

#### Scenario: Authenticated surface is unchanged after the default flip

- GIVEN a valid staff JWT
- WHEN the client calls any pets/owners/schedules/users endpoint
- THEN the response SHALL be identical to the behaviour before the default
  permission was tightened
