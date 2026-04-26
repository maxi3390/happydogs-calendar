# Design — Owner-forward tracking

## Why a separate `forwarded_at` column instead of reusing `read_at` or `dismissed_at`?

Each existing column models a different user intent:

- `read_at` — "the staff member glanced at this row" (clicking the per-row check).
- `dismissed_at` — "the staff member is done with this row, hide it."
- `forwarded_at` — "the staff member kicked off owner outreach via this row."

Conflating any two of those would lose information operators care about. Specifically: a row can be read but not forwarded (staff saw it, decided not to bother the owner), or forwarded but not dismissed (still showing because the owner might call back). The three signals are independent and small (a `DateTimeField` each is a few bytes), so we keep them separate.

## Why fire-and-forget on the frontend?

Two concerns:

1. **Latency.** The `mailto:` and `api.whatsapp.com/send` deep links are the user-visible action. If the API roundtrip blocked the window/app open, users would notice the half-second hitch.
2. **Failure tolerance.** If the API call fails (network blip, server restart), the deep link should still open. The cost of "the deep link opened but `forwarded_at` didn't get set" is one stale "Forward" pill, which is benign.

`navigator.sendBeacon()` is the canonical primitive for this kind of "side-effect on click" tracking; it works without holding the page open. We use it when available, with a `fetch({ keepalive: true })` fallback for older browsers.

## Why does the spec say "the click handler fires *before* opening the deep link"?

Because anchor clicks with `target="_blank"` (or default `mailto:` / `https:` schemes) hand control to the OS / browser immediately. Once the browser has navigated, our event handler can no longer run reliably. The shape is:

```ts
<a
  href={mailto}
  onClick={() => {
    api.notifications.forward(notif.id);  // fire-and-forget
  }}
>
```

We don't `preventDefault()` and reissue the navigation; that would add a click delay and isn't needed.

## Idempotency

The `forward` endpoint sets `forwarded_at = now()` only when the column is currently `NULL`. The first click "wins" — subsequent clicks are no-ops, the timestamp stays at the original click time. This matters for the audit-log feature (separate change): the timestamp is stable, not "last clicked."

If we ever decide we want a counter or a "last forwarded" semantic, we add a separate column. Don't overload `forwarded_at`.

## Where does the pill render?

Next to the existing event-date label in the row's right column. Same visual treatment as the `read_at` indicator (small green dot with a label) — consistent affordance for "this row has been acted on" signals. The forward buttons themselves stay visible but get a slightly muted variant + a `title` tooltip showing the relative time of the previous forward.

## What does "Already forwarded" mean for the audit log?

The companion change (`audit-log`) will track edits across owners, pets, etc., but it's NOT the right place to track this kind of "user clicked something" signal — that's user-action telemetry, distinct from data history. `forwarded_at` is the canonical record for the forward event; we don't need to also write a history row.
