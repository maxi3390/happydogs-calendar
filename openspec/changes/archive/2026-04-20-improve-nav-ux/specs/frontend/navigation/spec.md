# Delta for Frontend Navigation

This capability is introduced by this change. All requirements below are ADDED.

## ADDED Requirements

### Requirement: Primary Destinations Are Always Discoverable

The desktop header SHALL expose the application's primary destinations as explicit top-level links that are visible on every authenticated page. The primary destinations are Calendar (`/`), Owners (`/owners`), and Pets (`/pets`).

#### Scenario: Calendar link visible in desktop header

- GIVEN an authenticated user on any authenticated page
- WHEN the desktop viewport renders the header
- THEN a Calendar link pointing to `/` SHALL be visible in the header's primary nav cluster

#### Scenario: Owners and Pets links visible in desktop header

- GIVEN an authenticated user on any authenticated page
- WHEN the desktop viewport renders the header
- THEN links to `/owners` and `/pets` SHALL be visible in the header's primary nav cluster

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

### Requirement: Profile Dropdown Exposes User-Scoped Destinations

On desktop, the profile dropdown SHALL contain Settings, UI System (admin-only), and Sign Out. It SHALL NOT duplicate the Calendar / Owners / Pets / Admin top-level links.

#### Scenario: UI System available for admins in profile dropdown

- GIVEN an authenticated admin user on desktop
- WHEN the user opens the profile dropdown
- THEN the dropdown SHALL contain a UI System link pointing to `/ui-system`

#### Scenario: UI System hidden for non-admin users

- GIVEN a non-admin authenticated user on desktop
- WHEN the user opens the profile dropdown
- THEN no UI System entry SHALL be present in the dropdown

### Requirement: Mobile Menu Exposes Every Destination

On viewports below the `md` breakpoint, the header SHALL provide a hamburger menu that lists every destination available to the current user, including Calendar, Owners, Pets, Settings, Sign Out, and — for admins — Admin and UI System.

#### Scenario: Mobile menu lists admin-only destinations for admins

- GIVEN an admin user on a viewport below the `md` breakpoint
- WHEN the user opens the mobile menu
- THEN the menu SHALL additionally list Admin and UI System

### Requirement: Internationalized Labels

No labels in the navigation SHALL be hardcoded English strings. The translation catalogue SHALL contain `nav.calendar`, `nav.owners`, `nav.pets`, `nav.settings`, `nav.admin`, `nav.uiSystem`, `auth.signIn`, and `auth.signOut`.

#### Scenario: Switching language updates nav labels

- GIVEN the authenticated header is rendered in English
- WHEN the user switches the language to Spanish
- THEN every nav label SHALL update to its Spanish translation

### Requirement: Accessible Labels On Icon-Only Elements

Every nav element rendered icon-only SHALL provide a `title` attribute and an `aria-label` containing the same human-readable label that would otherwise be visible.

#### Scenario: Nav items have aria-label at md breakpoint

- GIVEN a `md`-breakpoint viewport (labels hidden)
- WHEN the header renders
- THEN every icon-only nav link SHALL carry an `aria-label` identifying its destination
- AND the same label SHALL be exposed as a `title` attribute

### Requirement: Active Destination Indicated Programmatically

The active nav link SHALL carry `aria-current="page"` so assistive technologies can announce the current location.

#### Scenario: Active link marked with aria-current

- GIVEN an authenticated user on `/pets`
- WHEN the header renders
- THEN the Pets nav link SHALL carry `aria-current="page"`
- AND the Calendar and Owners links SHALL NOT carry `aria-current`

### Requirement: Overlays Close On Escape

The mobile menu and the profile dropdown SHALL close when the user presses the Escape key while the overlay is open.

#### Scenario: Escape closes the profile dropdown

- GIVEN the profile dropdown is open
- WHEN the user presses the Escape key
- THEN the dropdown SHALL close

#### Scenario: Escape closes the mobile menu

- GIVEN the mobile menu is open
- WHEN the user presses the Escape key
- THEN the menu SHALL close

### Requirement: Page-Scoped Actions Stay Page-Scoped

Buttons that depend on the host page's state SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations. They MAY render inside the header when provided.
