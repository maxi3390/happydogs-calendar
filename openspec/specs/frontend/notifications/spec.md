# Frontend: Notifications Specification

## Purpose

Surface staff-facing notifications (vaccination/deworming/birthday/arrival/egress) in the navigation bar and on a dedicated `/notifications` page. Render forward-to-owner affordances (mailto: + wa.me) when the row carries owner-bound contact info. Hidden completely when the master `notifications` feature flag is off.

## Requirements

### Requirement: Navigation SHALL render a notification bell with an unread badge when the master flag is enabled

When `useFeatureFlag('notifications')` returns `true`, the navigation bar SHALL render a `NotificationBell` component. The component SHALL:

- Poll `GET /api/notifications/?unread_only=1` every 60 seconds.
- Render a count badge when the response is non-empty.
- On click, navigate to `/notifications`.

When the master flag is `false`, the bell SHALL NOT render.

#### Scenario: Master flag off — no bell

- GIVEN the `notifications` feature flag is disabled
- WHEN the operator opens any authenticated page
- THEN the navigation bar SHALL NOT render a notification bell
- AND no requests to `/api/notifications/*` SHALL be made

#### Scenario: Bell shows the count

- GIVEN the master flag is enabled
- AND the logged-in user has 3 unread notifications
- WHEN the navigation polls
- THEN the bell SHALL render a "3" badge

#### Scenario: Bell update on next poll

- GIVEN the bell shows "3"
- AND a new notification is created server-side
- WHEN the next 60-second poll fires
- THEN the bell SHALL render "4"

### Requirement: `/notifications` page SHALL list every undismissed notification with kind-specific copy and forward-to-owner actions

The `/notifications` page SHALL list each undismissed notification for the logged-in user, with each row showing:

- A localised one-liner under `notifications.kind.<kind>` interpolated with the row's `payload` (e.g. `{pet_name}`, `{age_years}`, `{vax_label}`).
- A **Mark read** button (visible only on unread rows) that `POST`s to `/api/notifications/{id}/mark_read/`.
- A **Dismiss** button that `POST`s to `/api/notifications/{id}/dismiss/` and removes the row from the list on success.

A row SHALL render forward-to-owner buttons ONLY when its `forward` field is non-null (the row's kind maps to a template scope: `vaccination_due`, `deworming_internal_due`, `deworming_external_due`, `pet_birthday`):

- A **Forward by email** button (rendered only when `forward.email.to` is non-null) that opens `mailto:<forward.email.to>?subject=<subject>&body=<body>` using the pre-rendered `forward.email.subject` and `forward.email.body` from the API response (URL-encoded).
- A **Forward by WhatsApp** button (rendered only when `forward.whatsapp.phone` is non-null) that opens `https://wa.me/<phone>?text=<text>` using the pre-rendered `forward.whatsapp.text`.

The frontend SHALL NOT do any placeholder substitution on the forward block — the API response already contains the rendered text using the operator's templates (or the localised defaults when the operator left a field empty).

A "Dismiss all" button at the top of the page SHALL `POST` to `/api/notifications/dismiss_all/` and clear the list.

When the list is empty, the page SHALL render a translated empty-state message (`notifications.page.empty`).

When the master flag is disabled, the page SHALL render an empty-state card so the user is not confused by a blank screen if they reached the route directly.

#### Scenario: Kind-specific copy

- GIVEN a `pet_arriving_today` notification for Luna
- WHEN the page renders
- THEN the row SHALL show the localised value of `notifications.kind.pet_arriving_today` interpolated with the row's payload (e.g. "Luna arrives today")

#### Scenario: Forward-to-owner email uses the pre-rendered subject/body

- GIVEN a `vaccination_due` notification whose API row has `forward.email = { subject: "Reminder: Luna's annual rabies is due 01/05/2026", body: "Hi Juana, …", to: "juana@example.com" }`
- WHEN the operator clicks "Email owner"
- THEN the browser SHALL open `mailto:juana@example.com?subject=Reminder...&body=Hi%20Juana...`
- AND the subject and body SHALL match the API row's `forward.email.{subject,body}` exactly (URL-encoded)

#### Scenario: Forward-to-WhatsApp uses the pre-rendered text

- GIVEN a `pet_birthday` notification whose API row has `forward.whatsapp = { text: "Happy birthday Luna!", phone: "+5491165432109" }`
- WHEN the operator clicks "WhatsApp owner"
- THEN the browser SHALL open `https://wa.me/5491165432109?text=Happy%20birthday%20Luna%21` (non-digit characters stripped from the phone)

#### Scenario: Internal-only kinds have no forward buttons

- GIVEN a `pet_arriving_today` notification (whose `forward` is `null`)
- WHEN the page renders the row
- THEN neither forward button SHALL be visible
- AND the Dismiss button SHALL still be visible

#### Scenario: Owner-bound kind without contact info hides only the affected button

- GIVEN a `vaccination_due` notification whose owner has `phone = ""` but a valid email
- WHEN the page renders the row
- THEN the "Email owner" button SHALL be visible
- AND the "WhatsApp owner" button SHALL NOT be visible

#### Scenario: Dismiss removes the row from the list

- GIVEN the page shows 3 notifications
- WHEN the operator clicks Dismiss on one
- THEN that row SHALL disappear from the list
- AND the bell badge SHALL decrement on next poll

#### Scenario: Empty state

- GIVEN the user has zero undismissed notifications
- WHEN they open `/notifications`
- THEN the page SHALL render the localised empty-state message
- AND no rows SHALL be rendered

### Requirement: Settings page SHALL surface notification controls when the master flag is enabled

The `/settings` page SHALL include a `NotificationsSettings` section, hidden when the master `notifications` flag is disabled. The section SHALL provide:

- **Nursery-wide** controls (admin-write): daily run time, deworming default-due-days, and the five per-kind toggles.
- **My preferences** (any authenticated user): the per-user `email_enabled` opt-in.
- **Message templates** (admin-write): two cards (`treatment_due`, `pet_birthday`) each with `email_subject`, `email_body`, `whatsapp_text` text fields. Empty fields fall back to localised defaults.

Non-admin users SHALL see the nursery-wide controls in a disabled state and the message templates section SHALL NOT render.

#### Scenario: Non-admin sees their preferences only

- GIVEN a non-admin user
- WHEN they open `/settings`
- THEN the My-preferences subsection SHALL be editable
- AND the nursery-wide controls SHALL be disabled
- AND the Message templates subsection SHALL NOT render
