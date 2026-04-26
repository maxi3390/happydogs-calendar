# Design — Per-user language preference

## Why store the choice on `User` and not on a separate `UserPreference` model?

Two reasons:

1. **It's a single, scalar field.** A whole table (or model) for one column would be overkill. If/when we add a third or fourth user-scoped preference, we promote to a `UserPreference` model in one move.
2. **Auth payloads.** The login / token-refresh response already includes the user object; adding a single field is free. A separate model would require a join or an extra request on every auth.

## Why default to `'es'` and not `'en'`?

The product is Spanish-language-first (the nursery is in Argentina; the seed data uses Spanish names; the existing `TranslationProvider` defaults to `'es'`). Existing rows with no language set at the time of the migration get `'es'` — that's the no-surprise path for users who've been clicking around in Spanish for months.

## Should we honour `Accept-Language` headers?

Only on the login / public surfaces, where there's no `User` to read from. The existing browser-language sniff in `TranslationProvider` already covers that case. We don't bring `Accept-Language` into the authenticated path — it would override the user's deliberately-set preference, which is exactly the bug we're fixing.

## What if a user changes language and then logs out before the PATCH lands?

`localStorage` still gets updated (we don't remove that path; it's the fallback for the next pre-auth load). On re-login, the `User.language` PATCH gets re-attempted? No — the PATCH would have failed silently and the next login simply uses whatever's on the server, plus the user can re-toggle. The user-visible cost is one re-toggle in a rare edge case; not worth a queue / retry mechanism.

## Migration strategy for existing rows

A single Django migration with two operations:

1. `AddField` for `User.language` (defaulting to `'es'`).
2. `RunPython` data step that backfills any existing row whose `language` is empty — pointless given the default, but explicit so the migration reads obviously.

If a future operator adds a row pre-migration (during a deploy window), they fall through the default path. No coordination needed.

## Edge case: a user's language is set to a value the server no longer supports

Say we drop EN in v3 and an existing row still has `language='en'`. The `TranslationProvider` would request `/api/translations/en/` which would 404, the provider would fall back to ES, and the user would be silently switched. That's acceptable — better than crashing — and we put a one-line `validate_language` step in the user serializer that snaps unknown values to the default on next PATCH.

## Why `PATCH /api/users/me/language/` and not just `PATCH /api/users/me/`?

Because the existing `User` PATCH endpoint is admin-scoped (admin editing other users). We don't want to broaden it to "users can edit themselves" because that scope shift comes with role-elevation concerns. A narrow, single-field endpoint is easier to reason about and easier to lock down.

## Email language

`_resolve_default(key, payload, lang='en')` in `backend/notifications/email.py` already takes a `lang` parameter. The email layer currently passes the hardcoded `'en'`. We change it to pass `notification.recipient_user.language` (with `'es'` as the literal fallback if the field is null). One-line change in `_send_one()`.
