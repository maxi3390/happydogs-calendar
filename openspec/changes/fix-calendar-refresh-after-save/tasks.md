# Tasks

## 1. Code

- [x] 1.1 Add an optional `refreshTrigger?: number` prop to `Calendar.tsx` (`CalendarProps`).
- [x] 1.2 Default it to `0` in the component signature so existing call-sites that don't pass the prop keep working.
- [x] 1.3 Append `refreshTrigger` to the `useEffect` dep array that calls `api.schedules.list`.
- [x] 1.4 Repeat 1.1–1.3 for `WeekView.tsx` (`WeekViewProps`).
- [x] 1.5 In `app/page.tsx`, pass `refreshTrigger={refreshSchedules}` to both the `<Calendar>` and `<WeekView>` instances.

## 2. Specs

- [x] 2.1 Write `openspec/changes/fix-calendar-refresh-after-save/specs/frontend/calendar/spec.md` — MODIFIED delta on the existing "Schedule Bars" / "Schedule Details Popup" requirements: the views SHALL re-fetch when the page-level refresh counter increments.
- [x] 2.2 When archiving, fold the requirement into the live `openspec/specs/frontend/calendar/spec.md`.

## 3. Verification

- [x] 3.1 `cd frontend && tsc --noEmit` (run inside a `node:22-alpine` container per AGENTS.md) — zero errors.
- [x] 3.2 `next build` (same container) — passes.
- [x] 3.3 Manual: edit a schedule via the day-schedule pencil → calendar bar reflects the change without navigation.
- [x] 3.4 Manual: same flow on the week view.
- [x] 3.5 Manual: schedule create + delete also refresh both views.
