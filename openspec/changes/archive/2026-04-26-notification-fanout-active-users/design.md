# Design — Notification fan-out filter

## Why `last_login` and not a hand-rolled "active in the app" timestamp?

Django's `User.last_login` is updated automatically on every successful auth, costs zero new code, and works for both interactive logins and JWT refreshes (which we're already doing through `simplejwt`'s rotation). A bespoke "last activity" timestamp would mean wiring middleware to bump the field on every authenticated request, plus the migration cost. `last_login` gives us 90% of the signal at 0% of the implementation cost.

The one place `last_login` differs from "is this person actually using the app" is long-running JWT sessions: a user who logged in 60 days ago and has been refreshing tokens daily would technically still be "active" but `last_login` says 60 days. We accept that trade-off — those users will simply hit the cutoff, log in again (the JWT refresh isn't infinite), and resume getting notifications. The friction is one `localStorage` clear away.

## Why a setting instead of a hard 30-day default?

Three reasons:

1. **Different operating cadences.** A nursery open 6 days/week with full-time staff has very different login patterns than a side-business with a single weekend operator. The same threshold can't be right for both.
2. **Reversibility.** A flat-30-day rule applied via code change requires a deploy to undo if it breaks someone's workflow. A setting lets the affected operator unblock themselves in seconds.
3. **The existing `NurserySetting` already holds half a dozen notification knobs** — adding one more is consistent and discoverable.

## Why `0 = no filter`?

`0` for "infinite" / "off" mirrors what `daily_booking_limit` and `due_after_days` already do in this codebase. Operators learn the convention once and apply it everywhere.

## Should we also exclude users with `email_enabled=False` from the recipient list?

No. The fan-out creates *in-app* notifications regardless of email preference; the email layer is the one that respects `NotificationPreference.email_enabled`. Excluding email-opted-out users from fan-out would silently break the bell badge for those users.

## What about the seeded dev dataset that produces 2,460 rows?

After this change, with the default 30-day lookback, the seeded dev dataset still produces a lot of rows because every test user's `last_login` is whatever the auth-fixture helper sets it to (usually `now`). That's fine — the change is for production-like data shapes, not seed data. Tests that explicitly want all-users behaviour can override the setting to `0`.

## What about the `notification-cron` container's own login pattern?

The cron runs as a Django management command, not authenticated to anything. It doesn't appear in `User`. Not a concern.

## Migration safety

The new field defaults to `30`, so the first migration application picks an opinionated default. Operators who want the previous "every active user" behaviour set it to `0` post-migration. We document this clearly in the migration's docstring AND in the field `help_text`.

The `NurserySetting` model is a singleton (`pk=1` enforced in `save()`), so the migration touches exactly one row.
