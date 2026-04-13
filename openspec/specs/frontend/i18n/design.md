# Design: Internationalization (i18n)

## Technical Approach

The internationalization system provides multi-language support through a **React Context-based translation provider** that fetches translations from the backend API at runtime. This architecture decouples translation management from frontend deployment — new languages or translation updates can be added on the server without rebuilding or redeploying the frontend.

Translations are accessed via a `t()` function that performs **dot-notation key lookup** with deep object traversal and supports **placeholder interpolation** using `{key}` syntax. The system defaults to **Spanish (es)** for the Latin American market, with automatic browser language detection.

## Architecture Decisions

### Decision: React Context API for Translation State

**React Context** provides translation state (current language, translation dictionary, `t()` function, language switcher) to the component tree, rather than using a dedicated i18n library like `react-intl`, `i18next`, or `next-intl`.

The translation requirements are straightforward: load a dictionary, look up keys, interpolate values. This doesn't warrant the complexity, bundle size, or learning curve of a full i18n library. react-intl adds ~12KB gzipped and introduces ICU message syntax complexity. i18next has a plugin ecosystem that's powerful but heavyweight for simple key-value lookups. A custom Context-based solution provides exactly what's needed in ~100 lines of code with zero dependencies.

*Tradeoffs:* A custom implementation lacks features that mature i18n libraries provide: pluralization rules, number/date formatting by locale, gender-aware translations, RTL support, and ICU MessageFormat syntax. If these features become needed, migrating to a library would require updating all `t()` call sites (though the function signature could be kept compatible). For a pet nursery management tool serving the Latin American Spanish-speaking market, simple key-value translations with placeholder interpolation cover 95%+ of use cases.

*Alternatives considered:* react-intl (rejected: ICU message format complexity not needed, heavy bundle), i18next + react-i18next (rejected: plugin architecture is overkill, large dependency tree), next-intl (rejected: couples to Next.js routing for locale, adds App Router complexity), next/font + built-in i18n (not applicable: Next.js App Router doesn't have built-in i18n routing).

### Decision: Backend-Fetched Translations

Translation dictionaries are **fetched from the backend API** at runtime rather than bundled as JSON files in the frontend build.

Server-fetched translations enable adding new languages and updating existing translations without frontend redeployment. A content manager or translator can update translations on the server, and clients pick up changes on their next page load. This is particularly valuable for a product serving multiple nurseries that may want customized terminology.

*Tradeoffs:* Runtime fetching means translations aren't available during server-side rendering (SSR), causing a brief flash of untranslated content or loading state on initial page load. Bundled translations would be available immediately but require a frontend deploy for every translation change. The SSR tradeoff is acceptable for a management tool where the loading state is brief and the user base is internal staff, not SEO-sensitive public pages.

Network failure or slow API response could leave the app without translations. The system should handle this gracefully: fall back to the translation keys themselves (which are readable English dot-notation strings like "pets.form.name") or to a bundled minimal fallback dictionary.

*Alternatives considered:* Bundled JSON files per locale (rejected: requires frontend deploy for translation changes), hybrid bundled + API overlay (considered: bundle base translations, fetch overrides from API — adds complexity for marginal benefit), static generation at build time with ISR (rejected: couples translation freshness to Next.js build/revalidation cycle).

### Decision: Spanish (es) as Default Language

The **default language is Spanish (es)**, reflecting the system's design for the **Latin American market**.

This is a business-driven decision, not a technical one. The primary user base is Spanish-speaking nursery staff in Latin America. Defaulting to Spanish means the app is immediately usable for the target audience without any configuration. English and other languages are available through the language switcher but aren't the default.

*Tradeoffs:* Non-Spanish-speaking users (e.g., developers, international staff) must switch languages on first use. Browser language detection mitigates this by auto-selecting English for `en-*` browser locales. The default could be made configurable per nursery instance (via environment variable or server setting), but hardcoding Spanish is simpler for the current single-market focus.

### Decision: Browser Language Detection

The system checks **`navigator.language`** on initial load and selects the best matching available language, checking for an `'es'` prefix to determine if Spanish should be used (falling back to Spanish as default if no match).

Automatic language detection reduces friction for bilingual environments where some staff prefer English. The check uses prefix matching (`navigator.language.startsWith('es')`) rather than exact match to handle locale variants (es-MX, es-AR, es-CO all match 'es').

*Tradeoffs:* Browser language may not match the user's preference for this specific application. A user with their browser set to English for general browsing might prefer the nursery app in Spanish. The language switcher provides manual override, and the selection is persisted (in localStorage or user profile) so detection only applies to the first visit.

*Alternatives considered:* User profile language preference (considered for future: store preference on the server per user, takes precedence over browser detection), URL-based locale (rejected: adds routing complexity, not needed for a single-deployment management tool), accept-language header server-side (rejected: not available in client-side rendering context).

### Decision: Dot-Notation Key Lookup with Deep Object Traversal

Translation keys use **dot notation** (e.g., `t('pets.form.name.label')`) that is resolved at runtime by traversing the nested translation dictionary object. The `t()` function splits the key by dots and walks the object tree to find the value.

Dot notation organizes translations hierarchically (by feature, then by component, then by element), making the dictionary maintainable and navigable. Deep traversal handles arbitrary nesting depth. This is the same convention used by i18next and most i18n libraries, making it familiar to developers.

*Tradeoffs:* Deep traversal has O(d) cost per lookup where d is the nesting depth (typically 3-4 levels). For the thousands of lookups per render, this is negligible. However, typos in keys fail silently (returning the key string as fallback) rather than causing compile-time errors. TypeScript could provide type-safe keys with a recursive template literal type, but the complexity of maintaining such types across a dynamic dictionary (fetched from API) is not worthwhile.

*Alternatives considered:* Flat key structure (e.g., `'pets_form_name_label'`) (rejected: loses hierarchical organization, harder to manage at scale), enum-based keys (rejected: requires frontend code changes for every new translation key), code-generated types from translation files (rejected: translations are fetched at runtime, not available at build time for type generation).

### Decision: Placeholder Interpolation with {key} Syntax

Translation strings support **`{key}` placeholder syntax** that is replaced at runtime via string replacement: `t('greeting', { name: 'John' })` with translation `"Hello, {name}!"` produces `"Hello, John!"`.

The `{key}` syntax is simple, readable in translation strings, and easy to implement with a regex replace. It covers the vast majority of dynamic content needs (inserting names, counts, dates into translated strings).

*Tradeoffs:* Simple string replacement doesn't handle pluralization (`{count} item` vs. `{count} items`), gender agreement, or conditional content. Libraries like react-intl use ICU MessageFormat (`{count, plural, one {# item} other {# items}}`) for these cases. For the current translation needs, `{key}` replacement is sufficient. Pluralization can be handled with separate keys (`items.one`, `items.other`) selected by the calling code.

*Alternatives considered:* ICU MessageFormat (rejected: requires a parser library, adds complexity for rarely-needed features), template literals evaluated at runtime (rejected: security risk, eval-adjacent), React component interpolation (considered for future: `t('message', { link: <a>...</a> })` for rich content, not needed currently).

### Decision: TranslationProvider in Layout.tsx

The `TranslationProvider` wraps the **entire application** in `layout.tsx` (the root layout), ensuring all components have access to translations from the initial render.

Placing the provider at the root ensures no component is rendered outside the translation context. This is necessary because translations are needed everywhere — navigation labels, form fields, error messages, button text. A per-page or per-feature provider would create gaps where untranslated content appears.

*Tradeoffs:* Root-level wrapping means the translation fetch blocks (or shows loading for) the entire app on initial load, not just the current page. This is a brief delay (one API call) that's acceptable for a management tool. The provider also re-renders all children when the language changes, which is the desired behavior (the whole UI should update) but could cause performance issues if the translation context value isn't memoized properly. The context value must be memoized with `useMemo` to prevent unnecessary re-renders when parent state changes for other reasons.

## Data Flow

1. **App loads** -> TranslationProvider mounts in layout.tsx -> Checks localStorage for saved language preference -> Falls back to browser language detection (`navigator.language`) -> Falls back to default ('es')
2. **Translations fetch** -> Calls backend API `GET /api/translations/:language` -> Receives nested translation dictionary object -> Stores in context state -> Sets loading to false
3. **Translation lookup** -> Component calls `t('pets.form.name')` -> `t()` function splits key by '.' -> Traverses dictionary object -> Returns translated string or key as fallback
4. **Placeholder interpolation** -> Component calls `t('greeting', { name: 'John' })` -> `t()` looks up key, finds `"Hola, {name}!"` -> Replaces `{name}` with `'John'` -> Returns `"Hola, John!"`
5. **Language switch** -> User selects new language from switcher -> Fetch new language dictionary from API -> Update context state -> All consuming components re-render with new translations -> Save preference to localStorage
6. **Missing key** -> `t()` can't find key in dictionary -> Returns the key string itself as fallback (e.g., `'pets.unknown.key'`) -> Visible in UI as an indicator that a translation is missing

## Key Files

- **`src/lib/translations.tsx`** — TranslationContext definition, TranslationProvider component, useTranslation hook (exposes `t()`, current language, language setter, loading state). Contains dot-notation key resolver, placeholder interpolation logic, browser language detection, localStorage preference persistence, and API fetch for translation dictionaries.
- **`src/domain/translations/types.ts`** — TypeScript types for the translation system. TranslationDictionary type (nested Record<string, string | TranslationDictionary>), Language type/enum, TranslationContextValue interface, and API response types.
