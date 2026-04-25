# Proposal — fix-calendar-overlap-display

## Intent

The monthly calendar drops schedules silently in busy weeks. Concrete repro from the seeded DB: pet **Nala**, schedule #5, runs Wed 22 Apr → Sat 25 Apr 2026. On Saturday Nala is the only schedule for the day, but no bar renders and no "+N more" indicator appears either — the schedule is invisible.

Two problems combine. The fix addresses both, and adds an in-place expand affordance so a busy week can be inspected without leaving the month view.

## Scope

### In scope

1. **Sort by greater range first.** The first-fit row-assignment algorithm gives lower rows to schedules processed earlier. The previous comparator used `end_date.localeCompare(start_date)` which only distinguishes single-day from multi-day, so a 4-day schedule could lose its visible row to a 3-day schedule that sorted first by start_date. Replace with a real range comparison (`Date.parse(end) - Date.parse(start)`, descending) so the longest-range schedules anchor rows 0..MAX-1 and tend to stay visible across all their days.

2. **Correct the "+N more" math.** The current overflow indicator computes `dayBarCounts[col] - MAX_VISIBLE_BARS` and renders only when positive. That goes negative on a day where a single high-row segment is the only bar (Nala's Saturday case), so the operator gets no breadcrumb that something is hidden. Replace it with a per-day count of segments whose `row >= MAX_VISIBLE_BARS` that span the column.

3. **Click "+N more" → expand the week in place.** Clicking the indicator no longer just selects the day. It expands the **whole week row** to show every overlapping schedule inline (no row clamp for that row), with a "Show less" button below the row to collapse back. The expansion is per-week and lives in component-local state — `expandedWeeks: Set<weekIdx>` — so other weeks stay compact. Navigating between months resets the expansions.

4. **Stay on the month view.** The expansion happens in place; no view switch, no navigation, no popup. The DaySchedule panel and ScheduleDetailsPopup behaviour are unchanged.

### Out of scope

- **A global "show all schedules" toggle.** The previous proposal added a localStorage-backed checkbox under `/settings`. That moved the per-screen layout decision off-screen, into a different page, with no in-context affordance to reverse it. Per-week expand is local, immediate, and discoverable — it replaces the toggle entirely.
- **Persistence of which weeks are expanded.** Expansions are session-local: clicking on a week, navigating away and back, or refreshing the page returns the calendar to the compact default. Week-level expansion is not state worth persisting.
- **Smarter row assignment beyond "longest first".** A globally optimal packing (so Nala on Saturday could be rendered at row 0 even though Nala has row 2 on Wed-Fri) would require splitting the bar across rows, which is harder to read and risks visual regressions. The longest-first sort handles the common case; the expand affordance handles the rest.
- **`WeekView`.** It already lays out one row per pet with no `MAX_VISIBLE_BARS` clamp; nothing is hidden there.

## Approach

1. **Sort.** Inline `rangeDays(s)` helper; `(b - a)` plus a `start_date` tie-breaker.
2. **Counts.** Track `dayHiddenCounts[col]` directly in the same loop that assigns rows: `+1` whenever `seg.row >= MAX_VISIBLE_BARS` and the segment crosses the column. Use that for the indicator.
3. **Expand state.** A single `Set<number>` keyed by week index. `toggleWeek(idx, expand)` mutates it via `setExpandedWeeks`. Reset to empty in a `useEffect` on `currentMonth` change.
4. **Indicator.** Becomes a `<button>` (was a `<div>`); on click it adds the week to `expandedWeeks` and stops propagation so the day cell underneath is not also selected.
5. **Show-less button.** Rendered only when the week is expanded *and* there was hidden content to expand in the first place. Sits in a small footer below the bars area, right-aligned.
6. **Cell heights.** A small `rowsForCol(colIdx)` helper that returns the row count for that day cell — capped at MAX + 1 (3 bars + 1 indicator) when collapsed, full count when expanded. The week's spacer height is `max(rowsForCol(c)) * 22 + 4`.
