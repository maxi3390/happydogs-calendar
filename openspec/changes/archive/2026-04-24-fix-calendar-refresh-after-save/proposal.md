# Proposal — fix-calendar-refresh-after-save

## Intent

When an operator edits a schedule from the schedule edit form (the modal popup reached via the day-schedule panel), the form saves correctly and the day-schedule panel re-fetches and reflects the change — but the **monthly calendar grid and weekly view do not refresh**. The schedule bars on those views keep showing the pre-edit dates / times / status until the operator manually navigates to another month / week and back, or hard-reloads the page. Same regression on schedule **creation** and **deletion**.

The root cause is straightforward: `Calendar.tsx` and `WeekView.tsx` ignore the page-level `refreshSchedules` counter that `app/page.tsx` already maintains. Their data-fetch `useEffect` lists only `currentMonth` (or `currentWeekStart`) as a dependency, so the only thing that triggers a re-fetch is navigation between periods. `DaySchedule` is wired up correctly via a `refreshTrigger` prop; the calendar views are not.

This change fixes the contract: every surface that paints schedules from `/api/schedules/` SHALL re-fetch when the page-level counter changes.

## Scope

### In scope

- Add an optional `refreshTrigger?: number` prop to `Calendar` (month view) and `WeekView` (week view) and include it in the `useEffect` dependency array that calls `api.schedules.list`.
- Wire `refreshSchedules` through `app/page.tsx` to both calendar components (the same prop that already feeds `DaySchedule`).
- Update the calendar spec to make the refresh contract explicit so future surfaces (e.g. a planned year view) inherit the same rule.

### Out of scope

- Changing how schedules are saved or what `handleScheduleSave` does. The existing contract — increment `refreshSchedules` on save — is correct; the calendar views were simply not subscribed.
- Adding an Edit button to `ScheduleDetailsPopup`. That popup is still read-only by design; edits flow through the day-schedule panel's pencil icon. If a future change adds in-popup editing, the refresh fix here is a prerequisite, not a duplicate.
- Optimistic UI / partial in-place updates of single bars. We re-fetch the whole window for simplicity and to keep `Schedule.conflicts` accurate (recomputed server-side). The window is at most one month of bookings, which the API already returns in tens of milliseconds.
- A loading skeleton for the refresh. The existing per-fetch `loading` flag already drives a small spinner overlay; reusing it keeps the visual diff tiny.

## Approach

1. Add the prop to both `CalendarProps` and `WeekViewProps`. Default to `0` when omitted so the public-calendar surface (which doesn't pass one) keeps its current behaviour.
2. Append `refreshTrigger` to the `useEffect` dependency arrays. React will re-run the effect whenever the parent bumps the counter, the same pattern already used by `DaySchedule`, `PetList`, and `OwnerForm`.
3. Pass `refreshSchedules` (already present in `app/page.tsx`) into both calendar component instances. The page already does this for `DaySchedule`; one additional prop on each of the two calendars matches that pattern exactly.
4. Codify the contract in the spec so the next person adding a schedule-displaying surface (e.g. a year heat-map, a printable view) plugs into the same counter rather than rolling their own.
