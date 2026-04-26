# Frontend: Notifications Specification

## Purpose

Surface staff-facing notifications (vaccination/deworming/birthday/arrival/egress) in the navigation bar and on a dedicated `/notifications` page. Render forward-to-owner affordances (`mailto:` + `api.whatsapp.com/send`) when the row carries owner-bound contact info. Hidden completely when the master `notifications` feature flag is off.

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
- A **Forward by WhatsApp** button (rendered only when `forward.whatsapp.phone` is non-null) that opens `https://api.whatsapp.com/send?phone=<phone>&text=<text>` using the pre-rendered `forward.whatsapp.text`. The `api.whatsapp.com/send` endpoint is preferred over `wa.me` because it preserves emoji glyphs verbatim across iOS, Android, and desktop WhatsApp clients (some `wa.me` redirects mangle higher-plane code points).

The frontend SHALL NOT do any placeholder substitution on the forward block — the API response already contains the rendered text using the operator's templates (or the localised defaults when the operator left a field empty).

Each row SHALL surface its read state visually: unread rows render a primary-coloured dot indicator next to the title and a subtle border highlight; read rows render neither.

Two top-level bulk-action buttons SHALL appear at the top of the page:

- A **Mark all read** button that `POST`s to `/api/notifications/mark_all_read/`. It SHALL be disabled when no row in the current view is unread.
- A **Dismiss all** button that `POST`s to `/api/notifications/dismiss_all/` and clears the list.

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
- THEN the browser SHALL open `https://api.whatsapp.com/send?phone=5491165432109&text=Happy%20birthday%20Luna%21` (non-digit characters stripped from the phone)
- AND the URL SHALL NOT use the `wa.me` short-link form, because some `wa.me` redirects mangle multi-byte emoji

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

#### Scenario: Mark all read clears every unread indicator

- GIVEN the page shows 5 rows of which 3 are unread
- WHEN the operator clicks "Mark all read"
- THEN the page SHALL refresh the list
- AND every row's unread dot SHALL disappear
- AND the "Mark all read" button SHALL become disabled
- AND the bell badge SHALL drop to 0 on next poll

#### Scenario: Mark all read is disabled when there is nothing to mark

- GIVEN the page shows 5 rows, all already read
- WHEN it renders
- THEN the "Mark all read" button SHALL be disabled

#### Scenario: Read state is visible on each row

- GIVEN a notification has `read_at = NULL`
- WHEN the page renders the row
- THEN the row SHALL show the unread dot indicator and a primary-coloured border highlight
- AND when the operator clicks the per-row Check button or the bulk "Mark all read", the indicators SHALL disappear after the next reload

#### Scenario: Empty state

- GIVEN the user has zero undismissed notifications
- WHEN they open `/notifications`
- THEN the page SHALL render the localised empty-state message
- AND no rows SHALL be rendered

### Requirement: Settings page SHALL surface notification controls when the master flag is enabled

The `/settings` page SHALL include a `NotificationsSettings` section, hidden when the master `notifications` flag is disabled. The section SHALL provide:

- **Nursery-wide** controls (admin-write): daily run time, deworming default-due-days, recipient lookback (days), and the five per-kind toggles.
- **My preferences** (any authenticated user): the per-user `email_enabled` opt-in.
- **Message templates** (admin-write): two cards (`treatment_due`, `pet_birthday`) each with `email_subject`, `email_body`, `whatsapp_text` text fields. Empty fields fall back to localised defaults.

Non-admin users SHALL see the nursery-wide controls in a disabled state and the message templates section SHALL NOT render.

#### Scenario: Non-admin sees their preferences only

- GIVEN a non-admin user
- WHEN they open `/settings`
- THEN the My-preferences subsection SHALL be editable
- AND the nursery-wide controls SHALL be disabled
- AND the Message templates subsection SHALL NOT render

### Requirement: Playwright suite SHALL cover the bell, the `/notifications` page, and the forward deep-links

The frontend Playwright suite SHALL include `frontend/tests/notifications.spec.ts` providing end-to-end coverage of the notification bell, the `/notifications` page, and the forward-to-owner buttons. The spec SHALL stub the `GET /api/feature-flags/` and `GET|POST /api/notifications/*` endpoints via Playwright's `page.route()` so it does not depend on driving the real cron from inside the Playwright container — the underlying API contract is verified separately by the backend test suite.

The components under test SHALL expose stable `data-testid` attributes for selection: `notification-bell` (with `data-unread-count`), `notification-bell-badge`, `notification-row` (with `data-kind` and `data-unread`), `forward-email`, `forward-whatsapp`, `mark-all-read`, and `dismiss-all`.

#### Scenario: Bell hidden when the master flag is disabled

- GIVEN the stubbed `GET /api/feature-flags/` returns `notifications.enabled = false`
- WHEN any authenticated page loads
- THEN no element with `data-testid="notification-bell"` SHALL render

#### Scenario: Bell renders with the unread count

- GIVEN the stubbed `GET /api/notifications/?unread_only=1` returns 3 rows
- WHEN any authenticated page loads
- THEN `data-testid="notification-bell"` SHALL be visible
- AND its `data-unread-count` attribute SHALL be `"3"`
- AND `data-testid="notification-bell-badge"` SHALL render the text `"3"`

#### Scenario: Forward email deep-link

- GIVEN a `pet_birthday` row whose `forward.email.to = "ana.garcia@seed.example"`
- WHEN the `/notifications` page renders
- THEN the row's `data-testid="forward-email"` anchor SHALL have an `href` matching `^mailto:ana\.garcia%40seed\.example`

#### Scenario: Forward WhatsApp deep-link uses the official endpoint

- GIVEN a `pet_birthday` row whose `forward.whatsapp.phone = "+54 11 4000 0001"`
- WHEN the `/notifications` page renders
- THEN the row's `data-testid="forward-whatsapp"` anchor SHALL have an `href` matching `^https://api\.whatsapp\.com/send\?phone=541140000001`
- AND the `href` SHALL NOT contain the substring `wa.me`

#### Scenario: Internal-only row hides forward buttons

- GIVEN a `pet_arriving_today` row whose `forward` is `null`
- WHEN the `/notifications` page renders
- THEN the row SHALL contain no `forward-email` anchor
- AND the row SHALL contain no `forward-whatsapp` anchor

#### Scenario: Mark-all-read disables itself when nothing is unread

- GIVEN every visible row already has a non-null `read_at`
- WHEN the `/notifications` page renders
- THEN `data-testid="mark-all-read"` SHALL have its `disabled` attribute set
- AND `data-testid="dismiss-all"` SHALL remain enabled
