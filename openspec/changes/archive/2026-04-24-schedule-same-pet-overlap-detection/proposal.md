# Proposal — schedule-same-pet-overlap-detection

## Intent

The schedule form already warns about cross-pet compatibility conflicts but says nothing when an operator is about to create a **second schedule for the same pet** that overlaps or is immediately adjacent to one that already exists. That silently produces duplicate / split bookings:

- Pet Luna already has 22–25 Apr 09:00–17:00.
- Operator opens the schedule form, picks Luna, picks 26 Apr 09:00–17:00.
- Form happily creates a separate one-day booking on 26 Apr.

The existing one should have just been extended to 26 Apr. The form had no affordance to surface that, no link to edit the existing booking, no hint about which date field to grow.

This change adds same-pet overlap/adjacency detection to the schedule form (single-mode only), with a "Edit existing schedule" CTA that opens the existing booking in edit mode and auto-focuses the date field the operator should adjust (start when extending backward, end when extending forward).

## Scope

### In scope

- Detect, in `ScheduleForm` single-mode, any **active** schedule (status `scheduled` or `checked_in`) for the selected pet whose date range overlaps OR is immediately adjacent (one calendar day apart) to the form's current `[start_date, end_date]`. Excludes the schedule currently being edited.
- Render a non-blocking info block under the existing conflict-result block, naming the existing schedule's range and offering an "Edit existing schedule" link.
- Compute a `focusField` per match: extend forward → `end_date`; extend backward → `start_date`; full overlap or contained-within → `end_date` as a sensible default.
- Add a `focusField?: 'start_date' | 'end_date'` prop to `ScheduleForm`. When set, the form auto-focuses the named date input on mount.
- A new `onEditExisting?: (scheduleId, focusField) => void` callback. When the user clicks the CTA, the form invokes it; the parent (the host page that owns the form's open/close state) closes the create modal and re-opens the form in edit mode for the existing schedule, passing the `focusField`.
- Wire the callback through `app/page.tsx` and `app/owners/page.tsx` (the two surfaces that mount `ScheduleForm` in single-mode).
- Translations under `schedule.samePetOverlap.*` in en + es.

### Out of scope

- **Multi-pet form (`mode: 'multi'`).** Same-pet overlap doesn't apply to a batch creation — each pet is its own row, and the existing `BatchScheduleResult.warnings` already surfaces per-pet issues at the backend response level.
- **Auto-merging.** The form never silently rewrites two schedules into one. The CTA opens the existing schedule for **manual** editing — the operator stays in control.
- **Time-of-day overlap on the same day.** That's already covered by the existing cross-pet conflict-check endpoint; piggybacking on its `overlapping_pets_count` would obscure the same-pet case. We use a separate detection pass focused only on same-pet date adjacency / overlap.
- **A new backend endpoint.** The existing `/api/schedules/?pet_id=X&start_date=Y&end_date=Z` filter already returns exactly what we need; the detection is purely a client-side pass on top.

## Approach

1. In `ScheduleForm`, add a debounced effect (alongside the existing conflict-check effect) that calls `api.schedules.list({ pet_id, start_date: D-1, end_date: D+1 })` whenever `singlePetId`/`startDate`/`endDate` change. Window is `[start - 1 day, end + 1 day]` so adjacency on either side is captured by the same query.
2. Filter the result client-side: drop the schedule currently being edited (if any), drop completed/cancelled, and bucket each remaining row by relationship (overlap, adjacent-forward, adjacent-backward).
3. Render the most relevant match (one schedule, the one closest in time) inside an amber info block with a `<button>` "Edit existing schedule (start–end) →". Click bubbles up via `onEditExisting`.
4. Parent page swaps modal state: clear the create flag, set `editingSchedule` to the existing one, set `editingFocusField` to the bubble-up value, mount `ScheduleForm` in edit mode with the `focusField` prop set.
5. `ScheduleForm` reads `focusField` once on mount and applies `autoFocus` to the right date input. If the prop is unset, no input is auto-focused (existing behaviour preserved).
