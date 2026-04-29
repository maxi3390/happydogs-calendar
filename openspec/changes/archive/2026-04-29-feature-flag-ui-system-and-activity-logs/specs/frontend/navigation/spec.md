# MODIFIED: Frontend / Navigation

## MODIFIED Requirements

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
