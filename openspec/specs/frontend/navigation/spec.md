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

### Requirement: Admin Destinations Are Top-Level For Admins

Users with the `admin` role SHALL see a top-level Admin link in the desktop header. Non-admin users SHALL NOT see this link in the primary nav.

#### Scenario: Admin link visible for admin users

- GIVEN an authenticated user whose role is `admin`
- WHEN the desktop viewport renders the header
- THEN a top-level Admin link pointing to `/admin/users` SHALL be visible in the primary nav cluster

#### Scenario: Admin link hidden for non-admin users

- GIVEN an authenticated user whose role is not `admin`
- WHEN the desktop viewport renders the header
- THEN no Admin link SHALL be visible in the primary nav cluster
- AND the profile dropdown SHALL NOT expose an Admin entry

---

### Requirement: Profile Dropdown Exposes User-Scoped Destinations

On desktop, the profile dropdown SHALL expose user-scoped destinations and actions. The dropdown is opened from the authenticated user's profile button and SHALL contain:

- A user info header (name, email, role indicator)
- Settings (`/settings`)
- For admin users, UI System (`/ui-system`) with a dev-tool icon
- Sign Out

For non-admin users, the UI System entry SHALL NOT be displayed.

The profile dropdown SHALL NOT duplicate the Calendar, Owners, Pets, or Admin (for admins) top-level links.

#### Scenario: Settings available in profile dropdown

- GIVEN an authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a Settings link pointing to `/settings`

#### Scenario: UI System available for admins in profile dropdown

- GIVEN an authenticated admin user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a UI System link pointing to `/ui-system`

#### Scenario: UI System hidden for non-admin users

- GIVEN a non-admin authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN no UI System entry SHALL be present in the dropdown

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
- UI System (`/ui-system`) — admin users only
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

Buttons that depend on the host page's state (for example, "New Schedule" on the Calendar page) SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations in this spec. They MAY render inside the header for convenience but their presence depends on the host page wiring them in.

#### Scenario: New Schedule button is only present on its host page

- GIVEN the Calendar (home) page provides an `onNewSchedule` callback
- WHEN the header renders on `/`
- THEN a New Schedule button SHALL appear
- WHEN the header renders on any other page that does not pass the callback
- THEN no New Schedule button SHALL appear
