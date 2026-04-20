# Design: UX Polish Pass

## Context

Five bugs/gaps, all shallow but user-visible, reported together:

1. Week view (and other date UIs) display English day/month names even in Spanish.
2. The "New Schedule" entry point only exists on the home page.
3. `/settings` renders "System Logo" / info text with `|| '…'` English fallbacks because the i18n keys are missing.
4. `/admin/users` has no translations; every string is hardcoded English.
5. Form modal scrollbars use the browser default, breaking the rounded/theme look.

They're unrelated fixes by root cause, but they're reviewer-facing polish items that make sense to ship as one change with narrow deltas against each affected capability.

## Decisions

### 1. `getDateLocale(language)` helper, not `useLocale()` hook

A plain function in `frontend/src/lib/dateLocale.ts` that switches on the `Language` type and returns the date-fns locale object. No React hook — consumers already have `language` from `useTranslation()`, and a hook would add a dependency for no gain. This keeps the helper usable outside React (e.g. tests, server components).

Signature:

```ts
import { enUS, es, type Locale } from 'date-fns/locale';
import type { Language } from '@/domain/translations/types';

export function getDateLocale(language: Language): Locale {
  return language === 'es' ? es : enUS;
}
```

Call sites pass `{ locale: getDateLocale(language) }` as the options bag `format()` already accepts. Affected files:

- `components/WeekView.tsx` — `format(currentWeekStart, 'MMM d')`, `format(weekEnd, 'MMM d, yyyy')`, `format(day, 'EEE')`.
- `components/DaySchedule.tsx` — `format(date, 'EEEE, MMMM d, yyyy')`.
- `components/Calendar.tsx` — `format(currentMonth, 'MMMM yyyy')`.
- `components/PublicCalendar.tsx` — `format(currentMonth, 'MMMM yyyy')`.

Other `format()` uses (e.g. ISO-date string formatting with `'yyyy-MM-dd'`) don't need a locale — those are machine formats and should stay locale-independent.

Alternative considered: switch `format` for `formatInTimeZone` / introduce a react-intl-style context. Rejected — too big for a polish pass. The helper call is a one-line addition per component.

### 2. Global New Schedule shortcut — dual-mode nav item

The nav ships one "New Schedule" item that behaves differently based on whether the host page wires in an `onNewSchedule` callback:

- Host injected a callback → render a `<button onClick={onNewSchedule}>` (existing direct-modal path).
- No callback → render a `<Link href="/?new=1">` that navigates to the home page.

The home page reads `useSearchParams()` on mount; if `new=1`, it sets `showScheduleForm = true` and calls `router.replace('/')` in the same effect to scrub the query param so a reload doesn't reopen the modal.

Why this shape: the on-home experience stays identical (no navigation roundtrip, no URL change), while other pages get a one-click path to scheduling. A Link is better than a button that uses `router.push` because right-click/middle-click "open in new tab" works naturally. The button form on the home page keeps state encapsulated in the parent component rather than leaking it through the URL.

The existing `onMultiPetSchedule` callback continues to render conditionally in the mobile menu; it's a narrower shortcut and isn't part of this change's scope.

### 3. Spec rewrite for `frontend/navigation`

The current spec has:

> ### Requirement: Page-Scoped Actions Stay Page-Scoped
>
> Buttons that depend on the host page's state (for example, "New Schedule" on the Calendar page) SHALL be passed into the Navigation component as optional callbacks and SHALL NOT be listed as navigation destinations…

This change introduces a new "Global New Schedule Shortcut" requirement that contradicts the old wording (new schedule IS now a nav destination). We keep the Page-Scoped requirement as a general principle (Multi-Pet Schedule still follows it) but remove the New-Schedule example, and ADD the new requirement for the New Schedule shortcut specifically.

### 4. Admin translations — dedicated `admin` namespace

Rather than scattering labels across `common`, `nav`, and page-specific namespaces, add an `admin` namespace that matches the surface of `/admin/users`. Benefits:

- A future admin page (`/admin/roles`, `/admin/audit-log`) can reuse the namespace.
- Searches for `admin.*` show the whole admin UI at once.
- Role and status badges (`admin.roleOptions.user/admin`, `admin.statusOptions.active/inactive`) live next to each other.

Common-scope keys (`common.cancel`, `common.save`) are re-used where they exist; we don't duplicate them under `admin`.

Re-use also includes `nav.admin` which already translates the nav link label; the page's `<h1>` re-reads it via a new `admin.title` for consistency with other page titles that use page-specific keys.

### 5. Styled scrollbar — scoped utility, not global

We're going to be conservative about scrollbar overrides. A site-wide `::-webkit-scrollbar` rule would affect every overflow context — code blocks, dropdowns, etc. — with unpredictable results. Instead we add a `.styled-scroll` utility and apply it only where we want it (the four form modal outer divs today, more later as needed).

The colors reference the existing theme tokens (`--border` and `--muted-foreground`) so dark mode and any future palette change automatically propagate. `scrollbar-width: thin` gives Firefox its thin variant without explicit widths.

### 6. Missing settings translations — just add the keys

`settings.systemLogo` and `settings.systemLogoInfo` are referenced in code as `t('settings.systemLogo') || 'System Logo'`. The `|| fallback` pattern hides the missing-key problem: a Spanish user sees "System Logo" because `t()` returned the dot-path and the fallback kicked in. Add both keys to `en.json` and `es.json`; drop the fallbacks in the component so future misses surface as the raw path (the project's documented debug behavior).

## Risks / Trade-offs

- **date-fns locale bundle size**: Importing `enUS` and `es` from `date-fns/locale` adds ~4 KB combined after minification. Acceptable for a frontend that already ships date-fns.
- **Query-string handshake for schedule modal**: If a user bookmarks `https://host/?new=1`, opening the bookmark auto-opens the modal. Intentional; the `router.replace('/')` only cleans the URL after the state is set so the bookmark still works once, which matches the "shortcut" semantics.
- **Admin page translation scope**: lots of strings; one extraction pass per component. Tests will still pass — E2E uses regex like `/admin|administraci[oó]n/i` already — but the admin page doesn't have its own E2E suite yet, so UI regressions would show up visually on the next review. Accepted risk for a polish pass.
- **Scrollbar style doesn't touch native OS scrollbars on macOS**: macOS trackpad users may still see the native overlay scrollbar, which is fine since they're already ephemeral. The change is additive — no regression for users who preferred the system default.
