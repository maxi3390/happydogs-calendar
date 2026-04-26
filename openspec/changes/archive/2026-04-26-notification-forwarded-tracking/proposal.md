# Track owner-forward action on notifications

## Why

The "Email owner" / "WhatsApp owner" buttons on each `Notification` row are currently fire-and-forget: clicking them opens the deep link in a new window/tab/app, but the system has no record that the staff member already did it. Two failure modes follow:

1. **Duplicate outreach.** Same staff member clicks the button twice (lost the email tab, didn't realise it had already opened); or two staff members both click it on Monday morning. The owner gets the same reminder two or three times in a row.
2. **No accountability when something gets missed.** When an owner says "I never got a reminder," there's no way to look at the row and confirm whether anyone actually clicked through.

A two-line backend change closes the loop: track when the staff first clicks a forward button, surface it as a "Forwarded ✓" pill on the row.

## What

Add a `Notification.forwarded_at` timestamp (nullable `DateTimeField`, default `NULL`). Add a `POST /api/notifications/{id}/forward/` endpoint with the same shape as the existing `mark_read` action — sets `forwarded_at = now()` if it's `NULL`, returns the updated row. Idempotent: subsequent calls are no-ops.

The frontend wires the click on either forward button (`Email owner`, `WhatsApp owner`) to fire that endpoint *before* opening the deep link. We use `navigator.sendBeacon` or a fire-and-forget `fetch()` so the user-visible window/app open isn't blocked by the API roundtrip.

The `/notifications` page renders a green "Forwarded ✓" pill next to the timestamp on rows where `forwarded_at` is non-null, and the forward buttons are visually de-emphasised (still clickable — the staff member may need to forward again, intentionally) but get a tooltip "Already forwarded {when}".

## Impact

- Backend:
  - `Notification.forwarded_at` field (`DateTimeField(null=True, blank=True)`).
  - One migration.
  - `forwarded_at` exposed in `NotificationSerializer`.
  - New `forward` action on `NotificationViewSet` mirroring `mark_read`.
  - 3 new tests (set, idempotent, cross-user 404).
- Frontend:
  - `notificationsApi.forward(id)` wrapper.
  - `forwarded_at: string | null` in `Notification` type.
  - Click handler on each forward button: fire-and-forget `forward()` call, then open the deep link.
  - "Forwarded ✓" pill rendered when `forwarded_at` is non-null.

## Out of scope

- Tracking which channel was used (email vs WhatsApp). One bit ("did anyone forward?") is enough for v1; per-channel granularity adds JSON to the row for marginal user-value.
- Showing a list of forwarded notifications to admins. The audit-log feature (separate change) covers that need across every entity, not just notifications.
- Auto-clearing the bell unread badge when a row is forwarded. Forward and read are orthogonal — a staff member might forward without reading the localised one-liner. Keep them independent.
