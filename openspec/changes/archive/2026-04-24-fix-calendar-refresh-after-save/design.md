# Design — fix-calendar-refresh-after-save

## The bug

`app/page.tsx` already implements the canonical refresh-on-mutation pattern used elsewhere in the app:

```tsx
const [refreshSchedules, setRefreshSchedules] = useState(0);

const handleScheduleSave = () => {
  setShowScheduleForm(false);
  setEditingSchedule(undefined);
  setRefreshSchedules(prev => prev + 1);
};
```

But of the three components that read `/api/schedules/`, only `DaySchedule` is subscribed to that counter:

```tsx
<DaySchedule
  date={selectedDate}
  onEditSchedule={handleEditSchedule}
  refreshTrigger={refreshSchedules}
  ...
/>

<Calendar
  selectedDate={selectedDate}
  onDateSelect={setSelectedDate}
  ...
/>          {/* ← no refreshTrigger */}

<WeekView
  selectedDate={selectedDate}
  onDateSelect={setSelectedDate}
  ...
/>          {/* ← no refreshTrigger */}
```

Each calendar component fetches inside a `useEffect` whose only dep is the visible period:

```tsx
useEffect(() => {
  // fetch month / week schedules
}, [currentMonth]);  // or [currentWeekStart]
```

So:

- After a save, `refreshSchedules` increments → `DaySchedule` re-renders → re-fetches.
- `Calendar` / `WeekView` re-render too (parent re-rendered) but their `useEffect` has no reason to re-run, so the in-memory `schedules` state stays stale.
- Visible result: the day-panel updates, the calendar bars don't.

## The fix

Three small edits. No data-flow changes, no new state, no new endpoints.

### 1. `Calendar.tsx`

```diff
 interface CalendarProps {
   onDateSelect: (date: Date) => void;
   selectedDate: Date;
   calendarView?: 'month' | 'week';
   onViewChange?: (view: 'month' | 'week') => void;
+  /** Bump from the parent (page-level `refreshSchedules` counter) to
+   *  force a re-fetch after a save / delete. Optional so the public
+   *  calendar can keep using the component without the wiring. */
+  refreshTrigger?: number;
 }

-export default function Calendar({ onDateSelect, selectedDate, calendarView = 'month', onViewChange }: CalendarProps) {
+export default function Calendar({ onDateSelect, selectedDate, calendarView = 'month', onViewChange, refreshTrigger = 0 }: CalendarProps) {
   ...
   useEffect(() => {
     // existing fetch
-  }, [currentMonth]);
+  }, [currentMonth, refreshTrigger]);
```

### 2. `WeekView.tsx`

Same shape — append `refreshTrigger` to props, default `0`, include in the `useEffect` dep array.

### 3. `app/page.tsx`

```diff
 <Calendar
   selectedDate={selectedDate}
   onDateSelect={setSelectedDate}
   calendarView={calendarView}
   onViewChange={setCalendarView}
+  refreshTrigger={refreshSchedules}
 />
 ...
 <WeekView
   selectedDate={selectedDate}
   onDateSelect={setSelectedDate}
   calendarView={calendarView}
   onViewChange={setCalendarView}
+  refreshTrigger={refreshSchedules}
 />
```

## Why this pattern (not a global query cache)?

`DaySchedule`, `PetList`, `OwnerForm` and the page-level handlers already use the counter-bump pattern (often called "refresh trigger" in this codebase). It's the project's idiomatic way to invalidate component-local fetches.

A global cache (React Query, SWR) would also solve this, but:

- It introduces a new dependency and a new mental model for one bug.
- The existing pattern is one line per call-site; the cost / benefit doesn't justify a refactor in this change.

If the team later moves to React Query for other reasons, this fix is a clean predecessor — the prop drilling already documents which surfaces consume the same key.

## Why `useEffect` deps over `useEffect` + `key`?

An alternative would be to remount each calendar with `key={refreshSchedules}` from the page. That works, but:

- It re-creates all internal state (current month, navigated week, the popup's `selectedSchedule`) on every save, which is bad UX — the operator would lose their view position.
- Adding to the `useEffect` dep array re-runs only the data fetch, preserving navigation state.

## Why `optional` rather than required?

`PublicCalendar` (the unauthenticated landing page calendar) reuses `Calendar`'s structure but never mutates schedules from the public side, so it has no counter to pass. Defaulting `refreshTrigger` to `0` means `PublicCalendar` keeps working without changes.

## Tests

The bug is purely a wiring issue between page-level state and child components, with no backend-visible delta. Regression coverage:

- `cd frontend && tsc --noEmit` — type-checks the new prop on both components.
- Manual verification:
  1. Open the home page, open the month view, click an existing schedule → details popup opens.
  2. Close popup. Click the edit pencil in the day-schedule panel. Change the start time. Save.
  3. The day-schedule panel reflects the new time **and** the calendar bar reflects the new time without navigating away or reloading.
  4. Same flow on the week view.
  5. Same flow on schedule create and delete.
