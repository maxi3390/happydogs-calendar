# Tasks

## 1. Day panel — show every schedule, add the button
- [x] 1.1 Remove the `max-h-[400px] overflow-y-auto` class string on the list container inside `DaySchedule.tsx` so the list grows to fit its contents; let the outer page scroll handle overflow.
- [x] 1.2 Add an optional `onNewSchedule?: () => void` prop to `DayScheduleProps`.
- [x] 1.3 Render a "+ New Schedule" button (primary variant, existing `Button` component) in the panel header, right-aligned, only when `onNewSchedule` is provided. Label uses the existing `nav.newSchedule` translation key.

## 2. Home page — wire the new prop, retire the old wiring
- [x] 2.1 In `app/page.tsx`, pass `onNewSchedule={() => { setEditingSchedule(undefined); setShowScheduleForm(true); }}` to `DaySchedule`.
- [x] 2.2 Remove `onNewSchedule` from the `Navigation` props (keep `onMultiPetSchedule`).
- [x] 2.3 Delete the `useEffect` that reads `?new=1` from `window.location.search`; the nav no longer routes there.
- [x] 2.4 Remove the `useRouter` import if it becomes unused after (2.3).

## 3. Navigation — drop the global shortcut
- [x] 3.1 Remove the dual-mode desktop New Schedule rendering block (the ternary that emits either a `<button>` or a `<Link href="/?new=1">`).
- [x] 3.2 Remove the mobile counterpart inside the hamburger menu.
- [x] 3.3 Remove `onNewSchedule` from `NavigationProps`.
- [x] 3.4 Clean up any now-unused imports (for example the `Link` import stays if used elsewhere, but any imports only needed by the removed blocks should go).

## 4. Specs
- [x] 4.1 `openspec/specs/frontend/navigation/spec.md`: remove the "New Schedule Global Shortcut" requirement and its three scenarios.
- [x] 4.2 `openspec/specs/frontend/navigation/spec.md`: modify "Page-Scoped Actions Stay Page-Scoped" to remove the New-Schedule carve-out note; restore the requirement's self-contained wording.
- [x] 4.3 `openspec/specs/frontend/calendar/spec.md`: add "Day Schedule Panel Lists All Scheduled Pets" requirement with scenarios covering many-schedule days, multi-day schedules, and no internal cap.
- [x] 4.4 `openspec/specs/frontend/calendar/spec.md`: add "New Schedule Action Lives In The Day Schedule Panel" requirement with scenarios covering the button's presence and the date pre-fill.
- [x] 4.5 Mirror both kinds of changes in `openspec/changes/day-panel-schedule-action/specs/frontend/{calendar,navigation}/spec.md` using the correct ADDED / MODIFIED / REMOVED markers.

## 5. Tests
- [x] 5.1 Audit `frontend/tests/navigation.spec.ts` for any assertion that expects a New Schedule link/button inside the header. If none exists, leave the file alone; if one does, delete or adjust it.

## 6. Verification
- [x] 6.1 `tsc --noEmit -p tsconfig.json` returns 0 errors.
- [x] 6.2 `docker compose build frontend` succeeds.
- [x] 6.3 Backend tests remain 222/222.
- [x] 6.4 Manual: create several schedules on one day; confirm all are visible in the day panel without nested scrolling.
- [x] 6.5 Manual: click a day in the calendar, then the panel's "+ New Schedule" button; confirm the form opens pre-populated with that day.
