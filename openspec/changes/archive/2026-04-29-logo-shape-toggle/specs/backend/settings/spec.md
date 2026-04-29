# ADDED: Backend / Settings

## ADDED Requirements

### Requirement: System Logo Shape

`NurserySetting` SHALL carry a `logo_shape` field (CharField, choices `'square'` / `'circle'`, default `'circle'`) that controls how every consumer of the system logo (navigation header, login page, settings preview) clips and sizes the image. The serializer SHALL expose `logo_shape` on `GET /api/settings/` and accept it via `PATCH /api/settings/update/`. Because `GET /api/settings/` is intentionally public (so the login page can render with the operator-chosen shape before authentication), `logo_shape` SHALL be present in the unauthenticated response.

The field is independent of the logo image itself: uploading or deleting the logo SHALL NOT modify `logo_shape`, and changing `logo_shape` SHALL NOT touch the logo file. This keeps the two concerns orthogonal — operators can flip the shape without re-uploading, and the upload path stays a pure file operation.

The default `'circle'` SHALL apply both to fresh installs (a new `NurserySetting` row created by `load()`) and to any pre-existing row migrated up via `0005_nurserysetting_logo_shape` — Django's `AddField` migration uses the model's `default` for every existing row, so an upgrade path that already had a logo will see it re-clipped to a circle automatically.

#### Scenario: GET response includes logo_shape

- GIVEN any caller (authenticated or anonymous)
- WHEN they issue `GET /api/settings/`
- THEN the response body SHALL include a `logo_shape` field whose value is one of `'square'` or `'circle'`

#### Scenario: Default logo_shape is circle

- GIVEN a fresh database with no `NurserySetting` row
- WHEN `NurserySetting.load()` creates the singleton
- THEN `logo_shape` SHALL be `'circle'`

#### Scenario: Admin can flip the shape via PATCH

- GIVEN an authenticated user with role `admin`
- AND the singleton's current `logo_shape` is `'circle'`
- WHEN the admin issues `PATCH /api/settings/update/` with `{"logo_shape": "square"}`
- THEN the response SHALL be HTTP 200 with `logo_shape: 'square'`
- AND a subsequent `GET /api/settings/` SHALL show `logo_shape: 'square'`

#### Scenario: Unknown logo_shape value is rejected

- GIVEN an authenticated admin
- WHEN they issue `PATCH /api/settings/update/` with `{"logo_shape": "triangle"}`
- THEN the response SHALL be HTTP 400
- AND the response body SHALL include a `logo_shape` field error

#### Scenario: Logo upload preserves the shape

- GIVEN the singleton's `logo_shape` is `'square'`
- WHEN an admin uploads a new logo via `POST /api/settings/upload_logo/`
- THEN the response SHALL be HTTP 200
- AND `logo_shape` in the response SHALL still be `'square'`
- AND the persisted singleton SHALL still have `logo_shape = 'square'`
