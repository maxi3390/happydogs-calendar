# Tasks

## 1. Calendar.tsx fixes

- [x] 1.1 Replace the `localeCompare` length sort with a real `rangeDays(end - start)` comparator (descending) plus a `start_date` tie-breaker.
- [x] 1.2 Track `dayHiddenCounts[col]` in the same loop that assigns rows, summing `+1` whenever `seg.row >= MAX_VISIBLE_BARS` and the segment crosses the column. Use it for the "+N more" indicator (replaces the broken `dayBarCounts - MAX` math).
- [x] 1.3 Add `expandedWeeks: Set<number>` component state and a `toggleWeek(idx, expand)` helper. Reset to empty in a `useEffect` keyed on `currentMonth`.
- [x] 1.4 Make the "+N more" indicator a `<button>`. On click, `toggleWeek(weekIdx, true)` and `stopPropagation()`.
- [x] 1.5 When a week is expanded, skip the row clamp on `visibleSegments`, suppress the "+N more" indicators, and grow the cell heights to fit every row.
- [x] 1.6 Render a "Show less" footer button below the bars area when the week is expanded *and* it had hidden content. Click → `toggleWeek(weekIdx, false)`.

## 2. Cleanup of the prior approach

- [x] 2.1 Delete `frontend/src/lib/calendarPreferences.ts` (no longer needed; the global toggle is replaced by per-week expand).
- [x] 2.2 Remove the "Calendar Display" card and its toggle from `frontend/src/app/settings/page.tsx`.
- [x] 2.3 Remove `settings.calendarDisplay.*` from `backend/translations/en.json` and `es.json`.

## 3. Translations

- [x] 3.1 Add `calendar.showLess` in en + es.

## 4. Specs

- [x] 4.1 Replace the existing delta in `openspec/changes/fix-calendar-overlap-display/specs/frontend/calendar/spec.md` to describe: corrected overflow indicator, longest-range sort, per-week expand, "Show less" button, expansion reset on month navigation.
- [x] 4.2 Drop the obsolete `specs/frontend/settings/spec.md` (no longer relevant).
- [x] 4.3 On archive, fold the calendar delta into `openspec/specs/frontend/calendar/spec.md`.

## 5. Verification

- [x] 5.1 `tsc --noEmit` (in `node:22-alpine` per AGENTS.md) — clean.
- [x] 5.2 `next build` — passes.
- [x] 5.3 Manual: April 2026 month view shows Nala's bar on Sat 25 Apr.
- [x] 5.4 Manual: click "+N more" on a busy week → week expands in place; "Show less" collapses it.
- [x] 5.5 Manual: navigate to May and back → expansion is reset.
