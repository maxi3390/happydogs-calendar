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

A row SHALL render forward-to-owner buttons ONLY when its `forward` field is non-null (the row's kind maps to a template scope: `vaccination_due`, `deworming_internal_due`, `deworming_external_due`, `pet_birthday`):

- A **Forward by email** button (rendered only when `forward.email.to` is non-null) that opens `mailto:<forward.email.to>?subject=<subject>&body=<body>` using the pre-rendered `forward.email.subject` and `forward.email.body` from the API response (URL-encoded).
- A **Forward by WhatsApp** button (rendered only when `forward.whatsapp.phone` is non-null) that opens `https://wa.me/<phone>?text=<text>` using the pre-rendered `forward.whatsapp.text`.

The frontend SHALL NOT do any placeholder substitution itself — the API response already contains the rendered text using the operator's templates (or the localised defaults when the operator left a field empty).

A "Dismiss all" button at the top of the page SHALL `POST` to `/api/notifications/dismiss_all/` and clear the list.

When the list is empty, the page SHALL render a translated empty-state message (`notifications.empty`).

When the master flag is disabled, the page SHALL redirect to `/` (or render a 404 — implementation choice).

#### Scenario: Kind-specific copy

- GIVEN a `pet_arriving_today` notification for Luna
- WHEN the page renders
- THEN the row SHALL show the localised value of `notifications.kinds.pet_arriving_today.title` (e.g. "Pet arriving today")
- AND the body SHALL be the localised template interpolated with `{name: "Luna", time_slot: "..."}`

#### Scenario: Forward-to-owner email uses the pre-rendered subject/body

- GIVEN a `vaccination_due` notification whose API row has `forward.email = { subject: "Reminder: Luna's annual rabies is due 01/05/2026", body: "Hi Juana, …", to: "juana@example.com" }`
- WHEN the operator clicks "Email owner"
- THEN the browser SHALL open `mailto:juana@example.com?subject=Reminder...&body=Hi%20Juana...`
- AND the subject and body SHALL match the API row's `forward.email.{subject,body}` exactly (URL-encoded)

#### Scenario: Forward-to-WhatsApp uses the pre-rendered text

- GIVEN a `pet_birthday` notification whose API row has `forward.whatsapp = { text: "🎉 Happy birthday Luna!", phone: "+5491165432109" }`
- WHEN the operator clicks "WhatsApp owner"
- THEN the browser SHALL open `https://wa.me/+5491165432109?text=%F0%9F%8E%89%20Happy%20birthday%20Luna%21`

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
