# MODIFIED: Frontend / i18n

## ADDED Requirements

### Requirement: TranslationProvider SHALL prefer the authenticated user's `language` over `localStorage`

The `TranslationProvider` SHALL pick the active language by walking the following sources in order, taking the first non-empty value:

1. `useAuth().user?.language` — the authenticated user's stored preference.
2. `localStorage.getItem('preferred_language')` — the device-wide last choice (used on login / register / public surfaces where there is no user yet).
3. The browser's primary language from `navigator.language`.
4. The hardcoded default `'es'`.

When the user changes the language via `LanguageSwitcher`:

- If authenticated, the component SHALL fire `PATCH /api/users/me/language/` with the new value AND update `localStorage`.
- If unauthenticated, the component SHALL update `localStorage` only.

#### Scenario: Two staff members on the same device

- GIVEN Alice has `user.language = "en"` server-side
- AND Bob has `user.language = "es"` server-side
- AND `localStorage.preferred_language = "en"` (left over from Alice's earlier session)
- WHEN Bob logs in on the same browser
- THEN the UI SHALL render in Spanish (Bob's stored preference wins over the stale `localStorage`)

#### Scenario: Pre-auth surface uses localStorage

- GIVEN no user is authenticated
- AND `localStorage.preferred_language = "en"`
- WHEN the login page renders
- THEN the UI SHALL render in English

#### Scenario: Authenticated change persists server-side

- GIVEN Alice is logged in with `language = "es"`
- WHEN she clicks the EN entry in `LanguageSwitcher`
- THEN a `PATCH /api/users/me/language/` SHALL be sent with `{"language": "en"}`
- AND `localStorage.preferred_language` SHALL be `"en"`
- AND on her next login from any device the UI SHALL render in English
