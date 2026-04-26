# MODIFIED: Backend / Notifications

## ADDED Requirements

### Requirement: `Notification.forwarded_at` SHALL track first owner-forward action

`Notification` SHALL gain a `forwarded_at` (`DateTimeField`, nullable, default `NULL`) field tracking the first time a staff member triggered an owner-forward action (email or WhatsApp) on the row. The field SHALL be exposed on the API in every place `read_at` is exposed.

A new endpoint `POST /api/notifications/{id}/forward/` SHALL set `forwarded_at = now()` if it is currently `NULL`, and SHALL be a no-op otherwise. The response SHALL be the updated notification row. The endpoint SHALL apply the same per-user 404 guard as `mark_read` and `dismiss`.

#### Scenario: First forward sets the timestamp

- GIVEN a notification owned by Alice with `forwarded_at = NULL`
- WHEN Alice `POST /api/notifications/{id}/forward/`
- THEN the response SHALL be HTTP 200
- AND the row's `forwarded_at` SHALL be set to a timestamp ≈ `now()`

#### Scenario: Subsequent forward is idempotent

- GIVEN a notification owned by Alice whose `forwarded_at` was set yesterday
- WHEN Alice `POST /api/notifications/{id}/forward/` again
- THEN the response SHALL be HTTP 200
- AND the row's `forwarded_at` SHALL be the original yesterday-timestamp (unchanged)

#### Scenario: Cross-user forward is 404

- GIVEN user Alice owns notification id 42
- AND user Bob is logged in
- WHEN Bob `POST /api/notifications/42/forward/`
- THEN the response SHALL be HTTP 404
- AND notification 42's `forwarded_at` SHALL remain `NULL`
