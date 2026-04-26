# Design — Audit log via django-simple-history

## Why django-simple-history specifically?

Three options were considered:

1. **Hand-rolled triggers / signals.** Cheap to write but expensive to maintain — every new field on every tracked model becomes a trigger update, drift is easy, and there's no canonical query API.
2. **`django-auditlog`.** Slightly newer, also maintained, also good. Stores changes as JSON blobs in one table. Pros: one table for all entities. Cons: queries are awkward (`JSON_EXTRACT` or Python-side filtering); each row is harder to migrate when the source schema changes.
3. **`django-simple-history`.** Generates one shadow table per model that mirrors the live table's schema plus four `history_*` columns. Queries look identical to the live model. Pros: type-safe, ORM-native, the canonical answer in the Django ecosystem. Cons: schema drift is real (every new field on `Pet` triggers a migration on `historicalpet`).

We pick **#3**: this codebase already lives and dies by Django migrations, the ORM-native query path matches how everything else is written, and the schema-drift cost is just one extra migration per change to the tracked models — a modest tax.

## Why these four models?

The pattern is "data the operator types and that an owner might dispute later." Pet attributes (especially temperament and dominance), owner contact info, medical notes, vaccination dates — those are the points where "wait, you have it wrong" can come up months after the fact. Schedules and notifications are derivative; their authoritative state is recoverable from the upstream entity.

## Why admin-only reads?

Staff users can already see the live record via the existing endpoints. Audit history is a different need — answering "who changed this?" — which is reasonably scoped to managers. If we discover non-admins legitimately need to see the history of their own edits, we can relax the permission per-endpoint without rewriting the storage.

## How does the user-attribution part work?

`simple_history.middleware.HistoryRequestMiddleware` wraps every request and stashes the authenticated user on a thread-local that the model save hooks read. So as long as the change goes through a request (the API layer, the admin, even a management command that explicitly uses `set_history_user`), the user gets recorded.

The notification cron runs OUTSIDE of any request, so it doesn't have a user. That's fine — its writes either don't touch tracked models, or when they do (rare), they get recorded with `history_user = NULL`. We document that the cron's writes are anonymous and that's intentional.

## Schema migration shape

Each `HistoricalRecords()` triggers an auto-migration that creates a `historicalpet` (etc.) table mirroring `pets_pet` plus:

- `history_id` (PK)
- `history_date` (timestamp)
- `history_user_id` (FK to User, nullable)
- `history_type` (`'+' | '~' | '-'`)
- `history_change_reason` (text, nullable)

We accept the migration as auto-generated — no hand-edits.

## Bulk operations and history rows

`simple_history` records changes per `.save()` call. `update()` / `bulk_update()` / raw SQL bypass the signal and DON'T produce history rows. This is a known library behaviour, and the right answer is to avoid bulk operations on tracked tables — which we already do throughout the codebase. The seed command's `update_or_create` calls each save individually, so they're tracked. Worth a one-line documentation note in `backend/AGENTS.md`.

## Admin-only history endpoints

Two paths considered:

1. **Generic** — one endpoint at `/api/__history__/<model>/<id>/` with serializer dispatch.
2. **Per-entity** — `/api/pets/<id>/history/`, `/api/owners/<id>/history/`, etc.

We pick **#2**: it slots cleanly into the existing per-resource URL structure, the serializer for each is one inheritance from a common `HistorySerializer`, and discoverability through OpenAPI is much better.

## Performance considerations

History tables grow at the rate of "writes × tracked models." For this product, that's a few hundred writes per nursery per month — utterly trivial. Disk usage on a 5-year-old DB would still be in the megabytes. We don't pre-emptively partition or archive; if anyone hits a real performance wall, the scale will already be such that they have engineering bandwidth to address it properly.
