# MODIFIED: Frontend / Notifications

## ADDED Requirements

### Requirement: Playwright suite SHALL cover the notification bell, the `/notifications` page, and the forward deep-links

The frontend Playwright suite SHALL include `frontend/tests/notifications.spec.ts` providing end-to-end coverage of the bell, the page, and the forward-to-owner buttons. The spec SHALL run against a freshly-seeded database with the master `notifications` feature flag enabled, drive the cron via `python manage.py generate_notifications`, and assert against the rendered DOM.

The spec SHALL cover at minimum:

- The bell badge renders with a non-zero count when unread rows exist.
- The bell does NOT render when the master flag is disabled.
- One row of each materialised kind is visible on `/notifications`.
- Per-row Mark Read and Dismiss work end-to-end.
- The page-level Mark-all-read button disables itself once there is nothing to mark.
- Forward deep-links use the official `https://api.whatsapp.com/send` endpoint (not `wa.me`).
- Internal-only kinds (arrival / egress) render no forward buttons.

#### Scenario: Bell badge present when notifications exist

- GIVEN the master `notifications` flag is enabled
- AND the cron has produced at least one unread row for the logged-in user
- WHEN the test loads any authenticated page
- THEN the navigation SHALL render a `NotificationBell` element
- AND the badge SHALL show a count `≥ 1`

#### Scenario: Forward email button uses the seeded owner email

- GIVEN a `pet_birthday` row whose pet's owner has `email = "ana.garcia@seed.example"`
- WHEN the test loads `/notifications`
- THEN the row's "Email owner" anchor SHALL have an `href` that starts with `mailto:ana.garcia%40seed.example` (URL-encoded)

#### Scenario: Forward WhatsApp button uses the official endpoint

- GIVEN a `pet_birthday` row whose pet's owner has `phone = "+54 11 4000 0001"`
- WHEN the test loads `/notifications`
- THEN the row's "WhatsApp owner" anchor SHALL have an `href` that starts with `https://api.whatsapp.com/send?phone=541140000001`
- AND the `href` SHALL NOT contain the substring `wa.me`

#### Scenario: Internal-only row hides forward buttons

- GIVEN a `pet_arriving_today` row
- WHEN the test loads `/notifications`
- THEN the row SHALL NOT contain an "Email owner" anchor
- AND the row SHALL NOT contain a "WhatsApp owner" anchor

#### Scenario: Mark-all-read disables itself once nothing is unread

- GIVEN every row in the current view is already read
- WHEN the test loads `/notifications`
- THEN the page-level "Mark all read" button SHALL have `disabled="true"` (or the equivalent ARIA attribute)

#### Scenario: Master flag off hides the bell

- GIVEN the master `notifications` flag is disabled
- WHEN the test loads any authenticated page
- THEN no `NotificationBell` element SHALL be present
- AND `/notifications` SHALL render the empty-state card
