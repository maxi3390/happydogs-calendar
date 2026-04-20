# Proposal: UX Polish Pass — Localized Dates, Global Schedule Shortcut, Missing Translations, Styled Scrollbars

## Intent

A focused polish pass addressing five distinct UX bugs/gaps observed in the current build:

1. The week view (and several other calendar-adjacent components) uses `date-fns` `format()` without passing a locale, so day-name and month-name labels stay English even when the active language is Spanish.
2. The global navigation has a "New Schedule" button only when the host page injects an `onNewSchedule` callback. Since only the Calendar (home) page does that, scheduling requires the user to go home first — there's no direct-action shortcut from anywhere else.
3. The `/settings` page renders "System Logo" and its info text via `t('settings.systemLogo') || 'System Logo'` and `t('settings.systemLogoInfo') || ...`, but neither key exists in `en.json` / `es.json`. Users see the English fallback in both languages.
4. The `/admin/users` admin user management page imports `useTranslation` but never calls `t()` — every label, modal title, table header, button, placeholder and confirmation message is hardcoded English. Switching to Spanish leaves the entire page untranslated.
5. The scrollable form modals (PetForm, OwnerForm, ScheduleForm, and the admin user modals) use the browser's default scrollbar, which looks like a Windows 95 artifact against the app's rounded, theme-aware UI.

## Scope

In scope:
- Add a small `getDateLocale(language)` helper in `frontend/src/lib/dateLocale.ts` returning the `date-fns` locale object for the active app language. Thread it through every `format()` call that emits day or month names (`EEE`, `EEEE`, `MMM`, `MMMM`, `LLL`, `LLLL`).
- Update Calendar, WeekView, DaySchedule, and PublicCalendar to accept and pass the active locale to `format()`.
- Promote "New Schedule" to a globally visible, always-available nav item. On the Calendar page, the item opens the existing modal (via the current `onNewSchedule` callback when provided). On any other page, the item navigates to `/?new=1` and the home page auto-opens the schedule modal + strips the query param.
- Add the missing `settings.systemLogo` and `settings.systemLogoInfo` translation keys in both `en.json` and `es.json`, and drop the `|| '…'` English fallbacks now that they're redundant.
- Add a full `admin.*` translation namespace and rewrite `/admin/users/page.tsx` to render every user-facing string via `t()`. Mirror the new keys in `frontend/tests/helpers.ts`.
- Add a `.styled-scroll` Tailwind utility in `globals.css` that styles scrollbars using the app's theme tokens (`--border`, `--muted-foreground`). Apply it to the four form modal containers.
- Extend OpenSpec: MODIFIED deltas for `frontend/calendar` (new "Localized Day And Month Labels" requirement), `frontend/navigation` (replace the "Page-Scoped Actions Stay Page-Scoped" requirement with a narrower version + new "New Schedule Global Shortcut" requirement), `frontend/user-management` (new "Localized User Interface" requirement), and `frontend/ui-components` (new "Styled Scrollbar Utility" requirement).

Out of scope:
- Translating every remaining hardcoded string app-wide beyond the admin page. Settings page's "Manage system configurations and rules" and a couple of legacy labels are left for a follow-up pass.
- Reworking the Schedule modal itself. The "auto-open via `?new=1`" handshake is the minimal wiring to make the global shortcut land on the existing modal.
- A generic "smart nav button" abstraction. The implementation keeps the small-surface approach: the nav stays plain JSX, the home page reads the query param, done.
- Scrollbar styling for everything that scrolls. Only the form modal containers are styled now; a broader pass can come later if there's demand.

## Approach

- **Issue 1 (locale-aware dates)**: Introduce `frontend/src/lib/dateLocale.ts` exporting `getDateLocale(language)` → `enUS | es` (date-fns v3+ ships both). Consumers that already use `useTranslation()` just read `language`, call `getDateLocale(language)`, and pass `{ locale }` to `format()`. No runtime dep is added — `date-fns` is already pinned.

- **Issue 2 (global Schedule shortcut)**: Add a persistent nav item (desktop + mobile) labelled via `t('nav.newSchedule')`. Visibility logic: when the host page passes `onNewSchedule`, the item is a `<button>` bound to that callback; when it doesn't, the item is a `<Link href="/?new=1">`. The home page uses `useSearchParams` to detect `new=1`, sets `showScheduleForm = true`, and calls `router.replace('/')` to clean the URL. This keeps the existing direct-click UX on the home page while making scheduling reachable from everywhere else.

- **Issue 3 (settings translations)**: Add `settings.systemLogo` and `settings.systemLogoInfo` to both locale JSON files. Remove the `|| '…'` English fallbacks from `/settings/page.tsx` — missing keys would surface as the dot-path, which is exactly what the translation debug contract says should happen.

- **Issue 4 (admin page translations)**: Rewrite `/admin/users/page.tsx` so every visible string goes through `t()`. Introduce an `admin` namespace in both locale JSONs covering: page header, description, stats labels, table headers, action labels, all three modal titles and bodies, labels for email/first_name/last_name/role/password/password_confirm/is_active fields, error and empty states, plus role and status badge labels. Re-use `common.cancel` / `common.save` / `common.delete` where they exist rather than duplicating under `admin`.

- **Issue 5 (scrollbar styling)**: Add a `.styled-scroll` utility in `globals.css` under `@layer utilities`:

    ```
    .styled-scroll {
      scrollbar-width: thin;
      scrollbar-color: hsl(var(--border)) transparent;
    }
    .styled-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .styled-scroll::-webkit-scrollbar-track { background: transparent; }
    .styled-scroll::-webkit-scrollbar-thumb {
      background: hsl(var(--border));
      border-radius: 4px;
    }
    .styled-scroll::-webkit-scrollbar-thumb:hover {
      background: hsl(var(--muted-foreground));
    }
    ```

    Apply `styled-scroll` alongside `overflow-y-auto` in the four form modals. Both Firefox (`scrollbar-width`/`scrollbar-color`) and Chromium (`::-webkit-scrollbar-*`) are covered; Safari respects the webkit variant too. No Tailwind plugin, no JS — pure CSS.
