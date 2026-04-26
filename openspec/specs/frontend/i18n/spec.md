# Internationalization Specification

## Purpose

Provide multi-language support for the application, enabling users to view the interface in English or Spanish. Language selection SHALL be detected automatically on first visit, persisted across sessions, and changeable at any time without requiring a page refresh. Translations SHALL be fetched from an external source rather than bundled with the application.

## Requirements

### Requirement: Supported Languages

The application SHALL support exactly two languages: English (en) and Spanish (es). All user-facing text MUST have translations available in both languages.

#### Scenario: English language available

- Given the application has loaded translations
- When the active language is set to English
- Then all user-facing text SHALL be displayed in English

#### Scenario: Spanish language available

- Given the application has loaded translations
- When the active language is set to Spanish
- Then all user-facing text SHALL be displayed in Spanish

### Requirement: Browser Language Auto-Detection

On the user's first visit, the application SHALL detect the browser's preferred language and select the closest supported language. If the browser language is Spanish, the application SHALL default to Spanish; otherwise, it SHALL default to English.

#### Scenario: Browser language is Spanish

- Given the user is visiting the application for the first time
- And no language preference has been previously stored
- And the browser's preferred language is Spanish
- When the application loads
- Then the active language SHALL be set to Spanish

#### Scenario: Browser language is English

- Given the user is visiting the application for the first time
- And no language preference has been previously stored
- And the browser's preferred language is English
- When the application loads
- Then the active language SHALL be set to English

#### Scenario: Browser language is unsupported

- Given the user is visiting the application for the first time
- And no language preference has been previously stored
- And the browser's preferred language is neither English nor Spanish
- When the application loads
- Then the active language SHALL default to English

#### Scenario: Stored preference overrides browser detection

- Given the user has a previously stored language preference
- When the application loads
- Then the stored language preference SHALL be used regardless of the browser language

### Requirement: Language Preference Persistence

The user's selected language SHALL be persisted in browser local storage so that it survives page reloads and new sessions.

#### Scenario: Language preference saved on change

- Given the user changes the active language
- When the language switch completes
- Then the selected language SHALL be saved to local storage

#### Scenario: Language preference restored on reload

- Given the user has previously selected a language
- When the user reloads the page
- Then the application SHALL restore the previously selected language from local storage

#### Scenario: Language preference restored in new session

- Given the user has previously selected a language
- When the user opens the application in a new browser session
- Then the application SHALL restore the previously selected language from local storage

### Requirement: Language Switcher Component

A language switcher component SHALL be available in the navigation bar, allowing users to change the active language at any time.

#### Scenario: Language switcher visible in navigation

- Given the application has loaded
- When the navigation bar is displayed
- Then the language switcher component SHALL be visible and accessible

#### Scenario: Switch from English to Spanish

- Given the active language is English
- When the user activates the language switcher and selects Spanish
- Then the active language SHALL change to Spanish

#### Scenario: Switch from Spanish to English

- Given the active language is Spanish
- When the user activates the language switcher and selects English
- Then the active language SHALL change to English

### Requirement: Real-Time Language Updates

When the active language changes, all visible text in the user interface SHALL update immediately without requiring a full page refresh.

#### Scenario: UI text updates on language change

- Given the application is displaying content in English
- When the user switches the language to Spanish
- Then all visible text elements SHALL update to their Spanish translations without a page reload

#### Scenario: Navigation text updates on language change

- Given the navigation bar displays labels in English
- When the user switches the language to Spanish
- Then navigation labels SHALL update to Spanish immediately

#### Scenario: Form labels update on language change

- Given a form is displayed with labels in English
- When the user switches the language to Spanish
- Then all form labels, placeholders, and help text SHALL update to Spanish immediately

### Requirement: Dot-Notation Translation Keys

The translation function SHALL support hierarchical dot-notation keys to organize translations into logical namespaces.

#### Scenario: Resolve a dot-notation key

- Given the active language has a translation for the key "pet.form.name"
- When the translation function is called with "pet.form.name"
- Then the function SHALL return the corresponding translated string

#### Scenario: Resolve a deeply nested key

- Given the active language has a translation for the key "settings.booking.limit.label"
- When the translation function is called with "settings.booking.limit.label"
- Then the function SHALL return the corresponding translated string

### Requirement: Placeholder Interpolation

The translation function SHALL support placeholder interpolation, allowing dynamic values to be inserted into translated strings using curly brace syntax.

#### Scenario: Interpolate a single placeholder

- Given a translation string contains the placeholder "{name}"
- When the translation function is called with the key and a value for "name"
- Then the returned string SHALL have the placeholder replaced with the provided value

#### Scenario: Interpolate multiple placeholders

- Given a translation string contains the placeholders "{count}" and "{total}"
- When the translation function is called with values for both "count" and "total"
- Then the returned string SHALL have all placeholders replaced with their corresponding values

#### Scenario: Placeholder with no value provided

- Given a translation string contains a placeholder "{name}"
- When the translation function is called without a value for "name"
- Then the placeholder MAY remain in the output or be replaced with an empty string

### Requirement: Translation Key Fallback

When a translation key cannot be resolved in the active language, the translation function SHALL return the key itself as a fallback to ensure the interface remains usable.

#### Scenario: Missing translation key

- Given a translation key "missing.key.example" does not exist in the active language
- When the translation function is called with "missing.key.example"
- Then the function SHALL return the string "missing.key.example"

#### Scenario: Existing translation key

- Given a translation key "common.save" exists in the active language
- When the translation function is called with "common.save"
- Then the function SHALL return the translated string, not the key

### Requirement: Translations Fetched from API

Translations SHALL be fetched from a remote API rather than bundled statically with the application. This allows translations to be updated independently of application deployments.

#### Scenario: Translations loaded from API on startup

- Given the application is starting
- When the initialization process begins
- Then the application SHALL request translations from the API for the active language

#### Scenario: Translations available after fetch

- Given the API has returned translation data
- When the translations are loaded
- Then all translation keys SHALL be available for use by the translation function

#### Scenario: API fetch failure

- Given the application attempts to fetch translations
- When the API request fails
- Then the application SHOULD display a meaningful fallback or error state
- And the translation function SHOULD return keys as fallback values

### Requirement: Loading State During Translation Fetch

While translations are being fetched from the API, the application SHALL display an appropriate loading state to inform the user that content is being prepared.

#### Scenario: Loading state displayed during fetch

- Given the application is starting
- When translations have not yet been loaded from the API
- Then a loading indicator SHALL be displayed

#### Scenario: Loading state dismissed after fetch

- Given the application is fetching translations
- When the translations have been successfully loaded
- Then the loading indicator SHALL be removed
- And the translated content SHALL be displayed

#### Scenario: Language switch loading state

- Given the user switches to a different language
- When new translations need to be fetched from the API
- Then a loading state MAY be shown until the new translations are available

### Requirement: TranslationProvider SHALL prefer the authenticated user's `language` over `localStorage`

The `TranslationProvider` SHALL pick the active language by walking the following sources in order, taking the first non-empty value:

1. `useAuth().user?.language` — the authenticated user's stored preference (returned by login / register / profile responses).
2. `localStorage.getItem('preferred_language')` — the device-wide last choice. Used on login / register / public surfaces where there is no user yet.
3. The browser's primary language from `navigator.language` (only the `'es'` branch promotes the default; everything else falls through).
4. The hardcoded default `'es'`.

When the user changes the language via `LanguageSwitcher`:

- The component SHALL update `localStorage.preferred_language`.
- IF authenticated, the component SHALL also fire `PATCH /api/users/me/language/` with the new value and apply the returned user shape to the auth context. The PATCH is fire-and-forget — its failure must not block the local switch.

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
