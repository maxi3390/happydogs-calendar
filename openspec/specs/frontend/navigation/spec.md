# Frontend Navigation Specification

## Purpose

Define the contract of the global top navigation (the `Navigation` component rendered on every authenticated page and on the public home page). The navigation is the primary surface for moving between major destinations, switching languages, switching themes, accessing user/session actions, and (for administrators) reaching admin-only areas. This spec describes visible destinations, role-based visibility, responsive behavior, accessibility, and overlay semantics.

## Requirements

### Requirement: Primary Destinations Are Always Discoverable

The desktop header SHALL expose the application's primary destinations as explicit top-level links that are visible on every authenticated page.

The primary destinations are:

- Calendar (home) at `/`
- Owners at `/owners`
- Pets at `/pets`

Users SHALL NOT need to open a menu or click the logo in order to reach any of these destinations.

#### Scenario: Calendar link visible in desktop header

- GIVEN an authenticated user on any authenticated page
- WHEN the desktop viewport (`md` breakpoint and above) renders the header
- THEN a Calendar link pointing to `/` SHALL be visible in the header's primary nav cluster

#### Scenario: Owners and Pets links visible in desktop header

- GIVEN an authenticated user on any authenticated page
- WHEN the desktop viewport renders the header
- THEN links to `/owners` and `/pets` SHALL be visible in the header's primary nav cluster

#### Scenario: Logo also routes home

- GIVEN any page (public or authenticated)
- WHEN the user activates the application logo / title
- THEN the user SHALL be routed to `/`

---

### Requirement: Profile Dropdown Exposes User-Scoped Destinations

On desktop, the profile dropdown SHALL expose user-scoped destinations and actions. The dropdown is opened from the authenticated user's profile button and SHALL contain:

- A user info header (name, email, role indicator)
- Settings (`/settings`)
- For admin users, Admin (`/admin/users`) with a `Shield` icon
- For admin users AND when the `activity_logs` feature flag is enabled, Activity (`/admin/activity`) with an `Activity` icon
- For admin users AND when the `ui_system` feature flag is enabled, UI System (`/ui-system`) with a dev-tool icon
- Sign Out

For non-admin users, none of the admin-only entries (Admin, Activity, UI System) SHALL be displayed regardless of the corresponding feature flag state.

The profile dropdown SHALL NOT duplicate the Calendar, Owners, or Pets top-level links.

#### Scenario: Settings available in profile dropdown

- GIVEN an authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a Settings link pointing to `/settings`

#### Scenario: Admin available for admins in profile dropdown

- GIVEN an authenticated admin user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain an Admin link pointing to `/admin/users`

#### Scenario: Admin hidden for non-admin users

- GIVEN a non-admin authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN no Admin entry SHALL be present in the dropdown

#### Scenario: UI System available for admins when the flag is enabled

- GIVEN an authenticated admin user on desktop
- AND the `ui_system` feature flag is `enabled = True`
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a UI System link pointing to `/ui-system`

#### Scenario: UI System hidden when the flag is disabled

- GIVEN an authenticated admin user on desktop
- AND the `ui_system` feature flag is `enabled = False`
- WHEN the user opens the profile dropdown
- THEN no UI System entry SHALL be present in the dropdown

#### Scenario: UI System hidden for non-admin users

- GIVEN a non-admin authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN no UI System entry SHALL be present in the dropdown

#### Scenario: Activity available for admins when the flag is enabled

- GIVEN an authenticated admin user on desktop
- AND the `activity_logs` feature flag is `enabled = True`
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain an Activity link pointing to `/admin/activity`

#### Scenario: Activity hidden when the flag is disabled

- GIVEN an authenticated admin user on desktop
- AND the `activity_logs` feature flag is `enabled = False`
- WHEN the user opens the profile dropdown
- THEN no Activity entry SHALL be present in the dropdown

#### Scenario: Sign Out available in profile dropdown

- GIVEN an authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a Sign Out action that logs the user out on activation

---

### Requirement: Mobile Menu Exposes Every Destination

On viewports below the `md` breakpoint, the header SHALL provide a hamburger menu that, when opened, lists every destination available to the current user. No major destination SHALL be reachable only on desktop.

For authenticated users, the mobile menu SHALL include:

- Calendar (`/`)
- Owners (`/owners`)
- Pets (`/pets`)
- Settings (`/settings`)
- Admin (`/admin/users`) — admin users only
- Activity (`/admin/activity`) — admin users only AND when the `activity_logs` feature flag is enabled
- UI System (`/ui-system`) — admin users only AND when the `ui_system` feature flag is enabled
- Sign Out

The mobile menu MAY also surface page-scoped actions (e.g. "New Schedule") that the host page provides via props; those are actions, not destinations.

#### Scenario: Mobile menu lists all authenticated destinations

- GIVEN an authenticated user on a viewport below the `md` breakpoint
- WHEN the user opens the mobile menu
- THEN the menu SHALL list Calendar, Owners, Pets, Settings, and Sign Out

#### Scenario: Mobile menu lists admin-only destinations for admins

- GIVEN an admin user on a viewport below the `md` breakpoint
- WHEN the user opens the mobile menu
- THEN the menu SHALL additionally list Admin and UI System

---

### Requirement: Public Navigation Shows Sign In

Unauthenticated users SHALL see the logo, language switcher, theme switcher, and a Sign In call-to-action. No authenticated-only destinations SHALL appear.

#### Scenario: Sign In link visible when not authenticated

- GIVEN a user with no active session
- WHEN the header renders
- THEN a Sign In link pointing to `/login` SHALL be visible
- AND no authenticated-only destinations (Owners, Pets, Settings, Admin, UI System) SHALL be visible

---

### Requirement: Internationalized Labels

All nav labels SHALL be sourced from the translation catalogue. No labels in the navigation SHALL be hardcoded English strings.

The following translation keys are required:

- `nav.calendar`
- `nav.owners`
- `nav.pets`
- `nav.settings`
- `nav.admin`
- `nav.uiSystem`
- `auth.signIn`
- `auth.signOut`

#### Scenario: Switching language updates nav labels

- GIVEN an authenticated user on the home page with English as the active language
- WHEN the user switches the language to Spanish
- THEN every nav label SHALL update to its Spanish translation
- AND no English text SHALL remain in the header

---

### Requirement: Accessible Labels On Icon-Only Elements

Every nav element rendered icon-only (including nav items at the `md` breakpoint, the profile button, and the mobile toggle) SHALL provide a `title` attribute AND an `aria-label` containing the same human-readable label that would otherwise be visible.

#### Scenario: Nav items have aria-label at md breakpoint

- GIVEN an authenticated user on a `md`-breakpoint viewport (labels hidden to save space)
- WHEN the header renders
- THEN every icon-only nav link SHALL carry an `aria-label` identifying its destination
- AND the same label SHALL be exposed as a `title` attribute for sighted hover feedback

#### Scenario: Hamburger button has accessible label

- GIVEN a viewport below the `md` breakpoint
- WHEN the header renders
- THEN the hamburger toggle SHALL carry an `aria-label` identifying it as the menu toggle

---

### Requirement: Active Destination Indicated Programmatically

The current destination SHALL be indicated both visually (existing active style) AND programmatically via `aria-current="page"` on the active nav link, so assistive technologies can announce the current location.

#### Scenario: Active link marked with aria-current

- GIVEN an authenticated user on `/pets`
- WHEN the header renders
- THEN the Pets nav link SHALL carry `aria-current="page"`
- AND the Calendar and Owners links SHALL NOT carry `aria-current`

#### Scenario: Logo marked with aria-current on home

- GIVEN a user on `/`
- WHEN the header renders
- THEN the logo link SHALL carry `aria-current="page"`

---

### Requirement: Overlays Close On Escape

The mobile menu and the profile dropdown SHALL close when the user presses the Escape key while the overlay is open.

#### Scenario: Escape closes the profile dropdown

- GIVEN the profile dropdown is open
- WHEN the user presses the Escape key
- THEN the dropdown SHALL close
- AND focus SHALL remain on the page (no navigation)

#### Scenario: Escape closes the mobile menu

- GIVEN the mobile menu is open
- WHEN the user presses the Escape key
- THEN the menu SHALL close

#### Scenario: Escape is a no-op when no overlay is open

- GIVEN neither the mobile menu nor the profile dropdown is open
- WHEN the user presses the Escape key
- THEN the header state SHALL NOT change

---

### Requirement: Page-Scoped Actions Stay Page-Scoped

Buttons that depend on the host page's state SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations in this spec. They MAY render inside the header for convenience but their presence depends on the host page wiring them in.

#### Scenario: Multi-Pet Schedule is only present when its host page provides the callback

- GIVEN the home page provides an `onMultiPetSchedule` callback
- WHEN the mobile menu renders on `/`
- THEN a Multi-Pet Schedule action SHALL appear
- WHEN the mobile menu renders on any other page that does not pass the callback
- THEN no Multi-Pet Schedule action SHALL appear

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
