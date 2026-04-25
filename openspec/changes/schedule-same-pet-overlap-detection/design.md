# Design — schedule-same-pet-overlap-detection

## Detection

The form already maintains `singlePetId`, `startDate`, `endDate` as state. A new `useEffect` (mirrors the existing 500ms-debounced conflict-check effect) issues:

```ts
api.schedules.list({
  pet_id: singlePetId,
  start_date: shiftDays(startDate, -1),
  end_date: shiftDays(endDate, +1),
});
```

The window is `[start − 1 day, end + 1 day]` so a one-day-adjacent existing schedule on either side falls inside the response. The list endpoint already filters by `pet_id` and the date-range overlap query (see `ScheduleViewSet.get_queryset`).

Client-side filter:

```ts
const candidates = list
  .filter(s => s.id !== schedule?.id)               // exclude self in edit mode
  .filter(s => s.status === 'scheduled' || s.status === 'checked_in');
```

Then classify each candidate:

```ts
function classify(existing, newStart, newEnd) {
  // returns: 'overlap-extends-forward' | 'overlap-extends-backward'
  //        | 'overlap-contained' | 'overlap-equal'
  //        | 'adjacent-forward' | 'adjacent-backward'
  //        | null
}
```

Buckets the relationship matters for the focus field:

| Relationship | Meaning | `focusField` |
|---|---|---|
| `adjacent-forward` | existing.end_date == newStart − 1 day | `end_date` (extend the existing's end) |
| `adjacent-backward` | existing.start_date == newEnd + 1 day | `start_date` (extend backward) |
| `overlap-extends-forward` | new.end_date > existing.end_date | `end_date` |
| `overlap-extends-backward` | new.start_date < existing.start_date | `start_date` |
| `overlap-contained` | new ⊆ existing | `end_date` (default) |
| `overlap-equal` | identical range | `end_date` (default) |

If multiple candidates qualify, pick the one with the smallest distance from `[newStart, newEnd]` (sort by `|existing.start − newStart| + |existing.end − newEnd|`, ascending). One-at-a-time avoids rendering a list and keeps the UI focused.

## UI

A new info block, rendered only in single-mode, sits below the existing cross-pet conflict block:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ This pet is already scheduled                             │
│                                                             │
│ Luna already has a schedule for 22 Apr → 25 Apr.            │
│ The new range is adjacent / overlapping; you might want     │
│ to extend the existing schedule instead.                    │
│                                                             │
│ [ Edit existing schedule → ]                                │
└─────────────────────────────────────────────────────────────┘
```

Visual treatment matches the existing amber conflict block (same Tailwind utilities) so the form's "warning" style is consistent.

The button's `onClick` calls `onEditExisting?.(existing.id, focusField)`. The form does NOT mutate any of its own state in response — it lets the parent close it and re-open in edit mode.

## Parent wiring

`app/page.tsx` already has:

```tsx
const [showScheduleForm, setShowScheduleForm] = useState(false);
const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
```

We add one more piece of state:

```tsx
const [editingFocusField, setEditingFocusField] = useState<
  'start_date' | 'end_date' | undefined
>();
```

The new callback:

```tsx
const handleEditExisting = async (scheduleId: number, focus) => {
  const existing = await api.schedules.get(scheduleId);
  setShowScheduleForm(false);
  setEditingSchedule(existing);
  setEditingFocusField(focus);
};
```

`ScheduleForm` is then mounted with `schedule={editingSchedule}` and the new prop `focusField={editingFocusField}`. The first effect on mount reads `focusField` and `.focus()`-es the right input.

Same wiring on `app/owners/page.tsx` (the multi-pet schedule form there uses `mode: 'multi'`, so this path isn't relevant for the schedule form opened from owners — but the page does have a single-mode schedule form for pet drill-downs; let me re-check before wiring).

Actually `app/owners/page.tsx` uses `<ScheduleForm mode="multi" preselectedPetIds={...} />` — multi-mode only. Same-pet detection doesn't apply there; the multi-mode form already skips the single-mode conflict check.

So only `app/page.tsx` needs the new wiring.

## Why client-side detection?

Could be done as a new endpoint (`/api/schedules/check_self_overlap/`) but:

- Existing list-with-filters covers the data: `pet_id` + date window.
- The detection logic is a small client-side bucket — easy to test, easy to read.
- Avoids a round-trip per keystroke; the existing conflict check already debounces the same window of changes.

If the rule grows more complex (per-pet quotas, time-of-day overlap on adjacent dates with cross-day stays), we'd move it server-side. For now, client-side is right-sized.

## Edge cases

- **Editing the existing schedule** (e.g. user shrinks Luna's 22–25 booking to 22–23). The detection runs, gets back Luna's other schedules in the window, and excludes the one being edited via `schedule?.id`. No false positive on the schedule being edited.
- **Status filter.** Cancelled / completed schedules are not "active"; we don't suggest editing a completed booking.
- **Multi-day flag off.** The form forces `endDate = startDate`. The detection still works because the window is computed from the ranges either way.
- **No pet selected.** Effect returns early; no info block.
- **Pet selected but dates incomplete.** Effect returns early.

## Tests

- `tsc --noEmit` (in `node:24-alpine`) — clean.
- `next build` — passes.
- Manual:
  1. Seeded DB has Luna with several schedules. Open the form, pick Luna, pick `25 Apr` (adjacent to `22 Apr → 25 Apr`). Block appears.
  2. Click "Edit existing schedule" → modal swaps to edit mode for the existing one; `end_date` input is focused.
  3. Same flow for a backward adjacency → `start_date` is focused.
  4. Pick a date well clear of any of the pet's bookings → no block appears.
  5. Open an existing schedule for editing, change dates to overlap a sibling schedule → block appears, points at the sibling.
