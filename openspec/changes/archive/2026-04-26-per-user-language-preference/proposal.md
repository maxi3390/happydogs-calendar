# Per-user language preference

## Why

Language today lives in `localStorage` (`preferred_language` key). Every browser session — every user that uses that browser — gets whichever language the last user picked. On a shared kiosk in the nursery (one laptop, three staff members rotating in and out across a shift), the language flips back and forth every login, which is both confusing and hostile to staff who have a strong preference.

Worse, when the same staff member moves between devices (their phone, the back-office desktop, the front-counter tablet), each device starts in whatever its previous user left behind, so they re-set their preference three times a day.

The right solution is to store the preference on the user, not the device.

## What

Add `User.language` (`CharField`, `choices=settings.SUPPORTED_LANGUAGES`, `default='es'`). Wire the existing `TranslationProvider` to:

1. Prefer `useAuth().user?.language` when present and non-empty.
2. Fall back to the existing `localStorage` value when there's no logged-in user (login page, register page, public calendar).
3. Fall back to browser language detection if both are absent.

When a logged-in user changes the language via `LanguageSwitcher`, the change SHALL persist on the `User` row (PATCH `/api/users/me/language`) instead of (only) `localStorage`. We keep `localStorage` as a hint for the next pre-auth page load — it doesn't have to disappear, it's just no longer authoritative.

## Impact

- Backend:
  - `User.language` field (nullable to support old rows pre-migration; serializer enforces choice).
  - One migration with a `data` step that backfills `'es'` for existing rows.
  - New `PATCH /api/users/me/language/` endpoint (or extension of an existing self-update endpoint) that an authenticated user can hit to change their own language.
  - Field exposed on the existing `me`/login/refresh response shapes so the frontend gets the value at auth time.
- Frontend:
  - `User.language` in the auth type.
  - `TranslationProvider` reads from `useAuth().user?.language` first.
  - `LanguageSwitcher` patches the user when authenticated, falls back to `localStorage` when not.
- Tests:
  - 3 backend tests (default value, PATCH self, cross-user PATCH refused).
  - 1 Playwright test (login as user A with `language=en`, switch to `es`, log out, log in again, verify `es` sticks).

## Out of scope

- Adding new languages. EN / ES are the only ones currently supported; the choices list mirrors `settings.SUPPORTED_LANGUAGES`.
- Per-tenant default language (a future multi-tenancy concern).
- Email language matching `User.language`. The notification email layer SHALL pick up the recipient's `language` automatically because `_resolve_default()` in `notifications/email.py` already takes a `lang` parameter — wiring that through to `recipient_user.language` is a small line-or-two change covered in this same task list.
