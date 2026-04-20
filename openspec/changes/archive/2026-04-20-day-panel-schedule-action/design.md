# Design: Relocate New Schedule Action To The Day Panel

## Context

Two observations from using the calendar page:

1. `DaySchedule` fetches schedules correctly from the backend (`GET /schedules/?date=YYYY-MM-DD` returns every schedule whose `[start_date, end_date]` range covers the selected day), but the component then renders the list inside a fixed-height `<div>` with `max-h-[400px] overflow-y-auto`. With more than four or five schedules, later entries are tucked below a nested scrollbar that the user often doesn't notice because the panel itself appears to end. The net effect looks like pets are missing from the day even though the data is present.

2. The "New Schedule" action was promoted to the global header in the `ux-polish-pass` change so users could start scheduling from any page. On the Calendar page specifically, that placement now competes with a more intuitive anchor: the user selected a day on the calendar, the right panel expanded to show that day, and the most obvious way to "add something to this day" should be a button on the day itself. A panel-level button also lets us skip the `?new=1` URL handshake and keep the Home page state self-contained.

This change merges both into one correction.

## Decisions

### 1. Drop the inner `max-h-[400px]` cap; rely on the page scroll

The day panel lives inside a CSS grid column that is already allowed to grow (`h-full` on the surrounding card). If a day has many schedules, the list can be tall without hurting the layout — the neighboring calendar doesn't depend on a fixed aspect ratio. Removing the cap is a one-line edit and has two benefits:

- Every schedule renders, regardless of count.
- The visual treatment becomes consistent with the rest of the panels (no nested scroll surface).

Alternative considered: keep the cap but bump it to `70vh` and apply the `styled-scroll` utility added earlier. Rejected — a still-bounded panel keeps the discoverability problem; the outer page scroll is a known affordance, while nested scrollbars are not.

### 2. `onNewSchedule` on `DaySchedule`, not baked-in

The panel stays a presentational component: it accepts an optional `onNewSchedule?: () => void`. The button is only rendered when the callback is provided, so other future callers (for example a read-only public view) can reuse `DaySchedule` without an unwanted create action.

Alternative considered: have the panel own its own schedule-form state and render the modal inside itself. Rejected — the schedule form is modal-scale and is already coordinated by the Home page (which also owns the `selectedDate` source of truth and triggers refresh fan-out). Splitting ownership would duplicate state.

### 3. Retire the nav-level New Schedule shortcut

Moving to the panel while keeping the nav shortcut would leave two entry points that could drift. The cleaner move is retirement:

- Remove the button/Link dual-mode rendering on desktop and mobile inside `Navigation.tsx`.
- Drop `onNewSchedule` from `NavigationProps` since no caller needs it anymore.
- Delete the `useEffect` in Home that read `?new=1` and auto-opened the modal — nothing issues that URL now.

Users on other pages reach scheduling by clicking the Calendar nav link and then the day's button. One click more than before from `/pets` or `/owners`, but the act of scheduling is inherently day-scoped and benefits from having the selected day visible at decision time.

Alternative considered: keep the nav `Link` to `/?new=1` as a fallback for non-home pages. Rejected — two ways to do the same thing invites confusion, and the UI now guides users to pick a day first, which is a better design.

### 4. Form pre-fill via existing prop

`ScheduleForm` already accepts `selectedDate: Date` and uses it to seed `start_date` and `end_date`. Home keeps `selectedDate` in state and passes the same value to both `DaySchedule` (for fetching) and `ScheduleForm` (for the form). When the panel's button fires, Home's existing `setShowScheduleForm(true)` opens the form and the pre-fill is automatic. No new props, no new helpers.

### 5. Spec shape

- `frontend/navigation`: REMOVE the "New Schedule Global Shortcut" requirement and all its scenarios. MODIFY "Page-Scoped Actions Stay Page-Scoped" to remove the narrow carve-out that called out New Schedule — the requirement now describes its principle without ad-hoc exceptions.
- `frontend/calendar`: ADD two requirements:
  - "Day Schedule Panel Lists All Scheduled Pets" — every overlapping schedule for the selected day is rendered without an internal scroll cap that could hide entries.
  - "New Schedule Action Lives In The Day Schedule Panel" — the panel exposes a button that opens the schedule form pre-populated with the currently selected date.

### 6. Test surface

`frontend/tests/navigation.spec.ts` has no direct "New Schedule is in the header" assertion today (the ux-polish-pass change added only the spec requirement, not an explicit E2E), but any regex that expects a New Schedule link inside `banner` role would need to be gentle. Audit and adjust if needed; if no adjustment is required, leave the file untouched.

No new E2E test for the day-panel button in this change — the calendar/day-panel area has no existing Playwright coverage, and adding one would require fixture schedules. Out of scope.

## Risks / Trade-offs

- **Users on other pages lose the one-click scheduling shortcut**. They now click Calendar then the day's button. The UX trade is intentional: scheduling is a day-scoped action and the new placement makes the selected day obvious. If users push back, restoring the nav shortcut is a localized revert.
- **A pathologically long schedule list will make the panel very tall**. Mitigated because the outer page scroll handles it naturally, and because real-world day counts are bounded by the nursery's daily booking limit (already a setting). Pretty-printing 100+ schedules on a single day isn't a problem this change signs up to solve.
- **The `?new=1` URL handler becoming dead code** means a stale bookmark from the ux-polish-pass era would no longer auto-open the form. The URL still renders the page correctly; only the auto-open stops. Non-breaking for users who aren't actively using such a bookmark.
- **Spec churn**: a requirement added in the previous change is removed here. This is deliberate — the spec history (via merge commits) reads "shortcut added" → "shortcut relocated" → current. The archival change folders both sit under `openspec/changes/archive/` with dates, so the evolution is traceable.
