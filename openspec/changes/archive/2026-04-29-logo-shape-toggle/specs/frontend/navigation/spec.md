# ADDED: Frontend / Navigation

## ADDED Requirements

### Requirement: Logo shape mirrors the operator's setting

The header logo container SHALL render with a clip path that matches the persisted `logo_shape` from `GET /api/settings/`. The container SHALL have a fixed size (the same size in both shapes) and the rendered `<img>` SHALL fill the container (`w-full h-full`) so the uploaded logo is the dominant visual rather than a small icon centred inside a coloured tile — this matches the behaviour of the upload preview on the Settings page.

When `logo_shape === 'circle'` the container SHALL be rendered as `rounded-full` with the image set to `object-cover` (filling the circle, cropping if necessary). When `logo_shape === 'square'` the container SHALL be rendered as `rounded-xl` with the image set to `object-contain` (preserving the image's full aspect ratio inside the rounded-corner rectangle; transparent margins fall on the container's coloured background).

The container SHALL carry `data-testid="nav-logo"` and `data-shape="<value>"` so operators can verify the rendering state from end-to-end tests.

The same shape SHALL apply on the login page (`data-testid="login-logo"`) so the visual identity is consistent across authenticated and unauthenticated surfaces. The login logo container SHALL also use a fixed size (the same in both shapes) and the rendered image SHALL fill it.

#### First-paint cache

The navigation header and login page SHALL hydrate `logo_shape` and `logo_url` from a `localStorage` cache (`nursery_logo_cache`) synchronously on mount, before the `GET /api/settings/` request fires, so a returning visitor sees their persisted shape on the first paint after hydration instead of flashing the default `circle` for the duration of the network round-trip. The cache SHALL be refreshed after every fresh `NurserySetting` payload — after the GET on every consuming surface, and after PATCH / upload / delete on the Settings page — so out-of-band server-side changes propagate to the next mount without delay.

A cache miss (first-ever visit, cleared storage, private browsing) SHALL fall back to the canonical default (`shape: 'circle'`, `url: null`); the subsequent fetch populates the cache for the next mount.

#### Scenario: Header reflects circle shape

- GIVEN the persisted `logo_shape` is `'circle'`
- WHEN any authenticated page renders
- THEN the navigation logo container SHALL carry `data-shape="circle"`

#### Scenario: Header reflects square shape

- GIVEN the persisted `logo_shape` is `'square'`
- WHEN any authenticated page renders
- THEN the navigation logo container SHALL carry `data-shape="square"`

#### Scenario: Square header logo fills its container

- GIVEN the persisted `logo_shape` is `'square'`
- AND a logo image has been uploaded
- WHEN any authenticated page renders
- THEN the navigation logo `<img>` SHALL carry the classes `w-full`, `h-full`, and `object-contain`

#### Scenario: Circle header logo fills its container

- GIVEN the persisted `logo_shape` is `'circle'`
- AND a logo image has been uploaded
- WHEN any authenticated page renders
- THEN the navigation logo `<img>` SHALL carry the classes `w-full`, `h-full`, and `object-cover`

#### Scenario: Login page mirrors the same shape

- GIVEN the persisted `logo_shape` is `'square'`
- WHEN an unauthenticated visitor opens the login page
- THEN the login logo container SHALL carry `data-shape="square"`

#### Scenario: First paint hydrates from the localStorage cache

- GIVEN the `nursery_logo_cache` localStorage key is set to `{ "shape": "square", "url": null }`
- AND the `GET /api/settings/` response is delayed
- WHEN any consuming surface (navigation header, login page) renders
- THEN the rendered logo container SHALL carry `data-shape="square"` BEFORE the GET resolves

#### Scenario: Cache is refreshed after every fresh settings response

- GIVEN a returning visit
- WHEN `GET /api/settings/` resolves with `logo_shape: 'square'`
- THEN the `nursery_logo_cache` localStorage key SHALL be set to a JSON payload containing `"shape": "square"`

#### Scenario: Settings PATCH refreshes the cache

- GIVEN the operator opens `/settings` and the cache currently reflects `circle`
- WHEN the operator clicks the square option in the shape toggle and the PATCH succeeds
- THEN the `nursery_logo_cache` localStorage key SHALL be updated to reflect `"shape": "square"`
