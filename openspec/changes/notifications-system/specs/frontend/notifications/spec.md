# ADDED: Frontend / Notifications

## ADDED Requirements

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

The `/notifications` page SHALL list each undismissed notification for the logged-in user, grouped by `kind`, with each row showing:

- A localised title (`notifications.kinds.<kind>.title`).
- A localised body interpolated with the row's `payload` and `pet` fields (`notifications.kinds.<kind>.body`).
- A **Dismiss** button that `POST`s to `/api/notifications/{id}/dismiss/` and removes the row from the list on success.
- A **Forward by email** button (rendered only when the pet's owner has an `email`) that opens `mailto:<owner.email>?subject=...&body=...` pre-filled from `notifications.forward.email.{subject,body}` translations interpolated with the row's data.
- A **Forward by WhatsApp** button (rendered only when the owner has a `phone`) that opens `https://wa.me/<phone>?text=...` pre-filled from the `notifications.forward.whatsapp.text` translation.

A "Dismiss all" button at the top of the page SHALL `POST` to `/api/notifications/dismiss_all/` and clear the list.

When the list is empty, the page SHALL render a translated empty-state message (`notifications.empty`).

When the master flag is disabled, the page SHALL redirect to `/` (or render a 404 — implementation choice).

#### Scenario: Kind-specific copy

- GIVEN a `pet_arriving_today` notification for Luna
- WHEN the page renders
- THEN the row SHALL show the localised value of `notifications.kinds.pet_arriving_today.title` (e.g. "Pet arriving today")
- AND the body SHALL be the localised template interpolated with `{name: "Luna", time_slot: "..."}`

#### Scenario: Forward-to-owner email

- GIVEN a notification for a pet whose owner has email `juana@example.com`
- WHEN the operator clicks "Email owner"
- THEN the browser SHALL open the system's default mail client with the recipient pre-filled to `juana@example.com`
- AND the subject and body SHALL match the `notifications.forward.email.{subject,body}` templates interpolated with the row's data

#### Scenario: Forward-to-WhatsApp

- GIVEN a notification for a pet whose owner has phone `+5491165432109`
- WHEN the operator clicks "WhatsApp owner"
- THEN the browser SHALL open `https://wa.me/+5491165432109?text=<encoded message>`
- AND the message body SHALL match the `notifications.forward.whatsapp.text` template

#### Scenario: Owner without email / phone

- GIVEN a notification for a pet whose owner has no email AND no phone
- WHEN the page renders
- THEN neither forward button SHALL be visible
- AND the Dismiss button SHALL still be visible

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
