# MODIFIED: Frontend / Admin Activity Feed

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: `/admin/activity` SHALL render an empty-state card when the `activity_logs` flag is off

When the `activity_logs` feature flag is `enabled = False`, the page SHALL skip the API fetch and render an empty-state card carrying `data-testid="activity-disabled"` so admins who navigate to the URL directly see a deterministic surface instead of an error banner from the gated endpoint.

#### Scenario: Direct visit when the flag is off

- GIVEN Alice is admin
- AND `activity_logs` is `enabled = False`
- WHEN Alice navigates to `/admin/activity`
- THEN the empty-state card with `data-testid="activity-disabled"` SHALL be visible
- AND the activity table (`data-testid="activity-table"`) SHALL NOT be rendered
- AND the page SHALL NOT issue a request to `/api/audit-log/activity/`
