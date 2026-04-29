# Frontend: admin activity feed

## Purpose

Provide an admin-only page at `/admin/activity` that renders the unified, paginated, filterable activity stream returned by `GET /api/audit-log/activity/`. The page is a UI surface over the existing audit-log infrastructure — no new write paths.

## Requirements

### Requirement: `/admin/activity` SHALL be an admin-only page that renders the activity feed

The page SHALL be wrapped in the `withAdmin` HOC: non-admin users SHALL be redirected to `/`, unauthenticated users SHALL be redirected to `/login`. The page renders a table of activity rows from `/api/audit-log/activity/`, ordered most-recent first.

Each row SHALL display:

- The timestamp of the change (`history_date`), formatted via the browser's locale.
- The user who made the change (`history_user.email`), or a dash when null.
- An action badge derived from `history_type` (`+` → "Created" / emerald, `~` → "Updated" / blue, `-` → "Deleted" / red).
- The entity type chip (Pet / Owner / Medical note / Vaccination), localised.
- The entity label (`entity_label`), in bold.

When the response has zero rows, an empty-state message SHALL render in place of the table.

#### Scenario: Admin opens the activity page

- GIVEN admin Alice navigates to `/admin/activity`
- AND the API returns three rows of mixed entity types and actions
- THEN the table SHALL render the three rows
- AND each row SHALL display its localised action badge
- AND the entity label SHALL be visible in bold

#### Scenario: Non-admin redirected away

- GIVEN user Bob is non-admin
- WHEN Bob navigates to `/admin/activity`
- THEN the page SHALL redirect to `/`

### Requirement: Filters SHALL round-trip to the backend via query params

The page SHALL render three filter controls above the table: entity (`all|pet|owner|medical_note|vaccination`), action (`all|+|~|-`), and period (`all|7d|30d|90d`). Changing any filter SHALL refetch the activity feed with the corresponding query params on the API request.

Switching filters SHALL reset the pagination offset to 0 so the operator never lands on a page-of-results that doesn't exist.

#### Scenario: Selecting "Owner" in the entity filter refetches with entity_type=owner

- GIVEN Alice is on `/admin/activity`
- WHEN she selects "Owner" in the entity filter
- THEN the page SHALL refetch the feed with `?entity_type=owner` in the query string
- AND only owner rows SHALL render

### Requirement: Pagination SHALL be server-side via offset / limit

The page SHALL render Previous / Next buttons + a "Page N of M" indicator beneath the table whenever the total `count` exceeds the page size (50). Clicking Next SHALL increment `offset` by the page size; clicking Previous SHALL decrement it; both SHALL refetch the feed with the new offset.

The pagination controls SHALL hide entirely when `count ≤ pageSize` (no need for navigation on a single-page result).

#### Scenario: Operator paginates through a 120-row feed

- GIVEN the feed contains 120 rows total (count = 120)
- AND the page size is 50
- WHEN Alice clicks Next
- THEN the page SHALL refetch with `?offset=50`
- AND the indicator SHALL read "Page 2 of 3"

### Requirement: An "Activity" entry SHALL appear in the admin profile dropdown when the `activity_logs` flag is on

The profile-menu dropdown SHALL include an "Activity" entry alongside Settings / Admin / UI System for admin users only AND only when the `activity_logs` feature flag is `enabled = True`. The entry SHALL link to `/admin/activity`. Non-admin users SHALL NOT see the entry. When the flag is off, the entry SHALL be absent for everyone.

#### Scenario: Admin sees the Activity entry when the flag is on

- GIVEN Alice is admin
- AND `activity_logs` is `enabled = True`
- WHEN she opens the profile dropdown
- THEN an "Activity" menuitem SHALL be visible
- AND its `href` SHALL be `/admin/activity`

#### Scenario: Admin does NOT see the Activity entry when the flag is off

- GIVEN Alice is admin
- AND `activity_logs` is `enabled = False`
- WHEN she opens the profile dropdown
- THEN no "Activity" menuitem SHALL be present

#### Scenario: Non-admin does not see the Activity entry

- GIVEN Bob is non-admin
- WHEN he opens the profile dropdown
- THEN no "Activity" menuitem SHALL be present

### Requirement: `/admin/activity` SHALL render an empty-state card when the `activity_logs` flag is off

When the `activity_logs` feature flag is `enabled = False`, the page SHALL skip the API fetch and render an empty-state card carrying `data-testid="activity-disabled"` so admins who navigate to the URL directly see a deterministic surface instead of an error banner from the gated endpoint.

#### Scenario: Direct visit when the flag is off

- GIVEN Alice is admin
- AND `activity_logs` is `enabled = False`
- WHEN Alice navigates to `/admin/activity`
- THEN the empty-state card with `data-testid="activity-disabled"` SHALL be visible
- AND the activity table (`data-testid="activity-table"`) SHALL NOT be rendered
- AND the page SHALL NOT issue a request to `/api/audit-log/activity/`
