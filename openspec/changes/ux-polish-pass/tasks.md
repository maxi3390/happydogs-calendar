# Tasks

## 1. Locale helper + localized date formatting
- [x] 1.1 Add `frontend/src/lib/dateLocale.ts` exporting `getDateLocale(language)`.
- [x] 1.2 WeekView: pass `{ locale }` to the three `format()` calls that produce day/month text.
- [x] 1.3 DaySchedule: pass `{ locale }` to the `EEEE, MMMM d, yyyy` header.
- [x] 1.4 Calendar: pass `{ locale }` to the `MMMM yyyy` header.
- [x] 1.5 PublicCalendar: pass `{ locale }` to the `MMMM yyyy` header.

## 2. Global "New Schedule" shortcut
- [x] 2.1 Navigation (desktop): render a persistent "New Schedule" item. Button when `onNewSchedule` is provided, Link to `/?new=1` otherwise.
- [x] 2.2 Navigation (mobile menu): render the same persistent shortcut using the same dual-mode rule.
- [x] 2.3 Home page (`app/page.tsx`): on mount, if `useSearchParams()` has `new=1`, set `showScheduleForm = true` and `router.replace('/')`.
- [x] 2.4 Confirm `onMultiPetSchedule` behavior is unchanged.

## 3. Settings translations
- [x] 3.1 Add `settings.systemLogo` and `settings.systemLogoInfo` to `backend/translations/en.json` and `es.json`.
- [x] 3.2 Drop the `|| '…'` English fallbacks from `/settings/page.tsx`.

## 4. Admin page translations
- [x] 4.1 Add an `admin` namespace in both locale JSON files covering page header, stats cards, toolbar, table headers, action tooltips, empty state, all three modal titles and bodies, labels for every form field, role and status badge labels, and confirmation text.
- [x] 4.2 Rewrite `/admin/users/page.tsx` to route every user-facing string through `t()`.
- [x] 4.3 Reuse existing `common.cancel`, `common.save`, `common.delete`, `nav.admin` where appropriate rather than duplicating.
- [x] 4.4 Mirror the new `admin.*` keys in `frontend/tests/helpers.ts` translation mocks (en + es).

## 5. Styled scrollbar utility
- [x] 5.1 Add `.styled-scroll` utility rules under `@layer utilities` in `globals.css` using `--border` and `--muted-foreground` theme tokens.
- [x] 5.2 Apply `styled-scroll` to the outer modal container in PetForm, OwnerForm, ScheduleForm, and each of the three admin user modals.

## 6. Spec deltas
- [x] 6.1 `openspec/changes/ux-polish-pass/specs/frontend/calendar/spec.md`: ADDED "Localized Day And Month Labels".
- [x] 6.2 `openspec/changes/ux-polish-pass/specs/frontend/navigation/spec.md`: ADDED "New Schedule Global Shortcut", MODIFIED "Page-Scoped Actions Stay Page-Scoped" (narrow example away from new-schedule).
- [x] 6.3 `openspec/changes/ux-polish-pass/specs/frontend/user-management/spec.md`: ADDED "Localized User Interface".
- [x] 6.4 `openspec/changes/ux-polish-pass/specs/frontend/ui-components/spec.md`: ADDED "Styled Scrollbar Utility".
- [x] 6.5 Apply the same modifications to the baseline specs under `openspec/specs/frontend/*`.

## 7. Verification
- [x] 7.1 `tsc --noEmit -p tsconfig.json` returns 0 errors.
- [x] 7.2 `docker compose build frontend` succeeds.
- [x] 7.3 Backend tests still 222/222.
- [x] 7.4 Manual: toggle to Spanish, confirm Week view day names, DaySchedule header, Calendar month header, and PublicCalendar month header all render in Spanish.
- [x] 7.5 Manual: from `/pets` or `/owners`, click "New Schedule" → land on `/` with the schedule modal open; URL is clean after.
- [x] 7.6 Manual: `/admin/users` in Spanish shows every string translated; open Create/Edit/Delete modals and confirm labels.
- [x] 7.7 Manual: form modal scrollbars render thin with themed colors in both light and dark modes.
