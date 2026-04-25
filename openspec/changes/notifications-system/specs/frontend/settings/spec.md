# MODIFIED: Frontend / Settings

## ADDED Requirements

### Requirement: Settings page SHALL surface a Notifications section gated by the master flag

When the `notifications` feature flag is enabled, the Settings page SHALL render a "Notifications" section containing:

- Five per-kind toggles (vaccination, arrivals, egress, birthdays, deworming) wired to the corresponding `NurserySetting.notifications_*_enabled` boolean fields.
- A daily run-time picker (`<input type="time">`) wired to `NurserySetting.notifications_run_time`.
- A deworming-default-due-days number input wired to `NurserySetting.deworming_default_due_days`.

When the master flag is disabled, the section SHALL NOT be rendered. Operators do not need to configure something they can't see.

The Vaccination Type form (existing section) SHALL gain a `due_after_days` number input (default 365, accepts 0 for non-recurring).

#### Scenario: Master flag enabled

- GIVEN the `notifications` feature flag is enabled
- WHEN an operator opens `/settings`
- THEN the Notifications section SHALL be visible above the existing System Conflict Rules info
- AND each per-kind toggle SHALL reflect the current `NurserySetting` value
- AND saving any field SHALL `PATCH` `/api/settings/`

#### Scenario: Master flag disabled

- GIVEN the `notifications` feature flag is disabled
- WHEN an operator opens `/settings`
- THEN the Notifications section SHALL NOT be visible

#### Scenario: VaccinationType cadence input

- GIVEN the VaccinationType form is open for editing
- WHEN the operator changes `due_after_days` to `1095` and saves
- THEN a `PATCH` to `/api/vaccination-types/{id}/` SHALL include `due_after_days = 1095`
- AND the change SHALL persist on reload

### Requirement: Per-user notification preferences SHALL be reachable from the user dropdown

The logged-in user SHALL have access to a small "Notification preferences" panel reachable from the existing user dropdown menu in the navigation. The panel SHALL show:

- An `email_enabled` toggle (default checked) wired to `NotificationPreference.email_enabled` for the logged-in user.

The panel SHALL NOT render when the master `notifications` feature flag is disabled. Telegram fields SHALL NOT be present in v1 (deferred to a follow-up change).

#### Scenario: First-time visit creates the preference row

- GIVEN a logged-in user has no `NotificationPreference` row
- WHEN they open the Notification preferences panel
- THEN a `GET /api/notifications/preferences/` SHALL be issued
- AND the response SHALL contain the default `email_enabled = True`
- AND a row SHALL be created server-side

#### Scenario: Toggling email off

- GIVEN the panel shows `email_enabled = True`
- WHEN the user unchecks the toggle and the change is auto-saved (or manually saved)
- THEN a `PATCH /api/notifications/preferences/` SHALL be issued with `{"email_enabled": false}`
- AND subsequent cron runs SHALL NOT email the user
- AND in-app notifications SHALL still appear in the user's bell
