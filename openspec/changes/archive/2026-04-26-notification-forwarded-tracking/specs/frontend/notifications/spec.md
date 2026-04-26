# MODIFIED: Frontend / Notifications

## ADDED Requirements

### Requirement: Forward buttons SHALL fire a tracking call before opening the deep link

When the staff member clicks the **Email owner** or **WhatsApp owner** anchor on a row whose `forward` block is non-null, the page SHALL fire a fire-and-forget `POST /api/notifications/{id}/forward/` *before* the browser handles the anchor's `href`. The tracking call MUST NOT block or delay the deep-link navigation; failures (network blip, server error) SHALL be silent.

When the row's `forwarded_at` is non-null:

- A small "Forwarded ✓" pill SHALL render in the row's right-hand column next to the event date.
- The forward buttons SHALL retain their normal click behaviour (a staff member may legitimately want to forward again — the timestamp does not move on subsequent clicks).
- The forward buttons SHALL carry a `title` tooltip indicating "Forwarded {relative-time}" so the staff member sees that someone — possibly themselves — already kicked it off.

#### Scenario: First forward sets the pill on next reload

- GIVEN a row whose `forwarded_at` is `NULL`
- WHEN the staff member clicks "Email owner"
- THEN a `POST /api/notifications/{id}/forward/` SHALL be sent
- AND the user's mail client SHALL open with the pre-rendered subject and body
- AND on the next reload of `/notifications` the row SHALL show the "Forwarded ✓" pill

#### Scenario: Forward call fails — deep link still opens

- GIVEN a row whose `forwarded_at` is `NULL`
- AND the API is unreachable
- WHEN the staff member clicks "WhatsApp owner"
- THEN the browser SHALL still navigate to the WhatsApp deep link
- AND no exception SHALL be visible to the user
