# Delta for Frontend Navigation

## REMOVED Requirements

### Requirement: Admin Destinations Are Top-Level For Admins

**Reason**: The admin destination is occasional-use and doesn't belong on the same level as the daily-use primary destinations (Calendar, Owners, Pets). It moves into the profile dropdown so the primary nav stays a consistent three-item cluster for everyone and every user-scoped destination lives in one place.

**Migration**: Admin (`/admin/users`) is now covered by the "Profile Dropdown Exposes User-Scoped Destinations" requirement. Administrators reach `/admin/users` through the profile dropdown instead of a top-level header link. Non-admin visibility is unchanged (they never saw the top-level link and they never see the dropdown entry).

## MODIFIED Requirements

### Requirement: Profile Dropdown Exposes User-Scoped Destinations

On desktop, the profile dropdown SHALL expose user-scoped destinations and actions. The dropdown is opened from the authenticated user's profile button and SHALL contain:

- A user info header (name, email, role indicator)
- Settings (`/settings`)
- For admin users, Admin (`/admin/users`) with a `Shield` icon
- For admin users, UI System (`/ui-system`) with a dev-tool icon
- Sign Out

For non-admin users, neither the Admin entry nor the UI System entry SHALL be displayed.

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
