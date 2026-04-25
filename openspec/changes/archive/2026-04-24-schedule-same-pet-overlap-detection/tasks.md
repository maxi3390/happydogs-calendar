# Tasks

## 1. Detection logic

- [x] 1.1 In `ScheduleForm` (single-mode only), add a debounced effect that lists `api.schedules.list({ pet_id, start_date: D-1, end_date: D+1 })` whenever `singlePetId` / `startDate` / `endDate` change.
- [x] 1.2 Filter out the schedule being edited (if any) and any cancelled / completed rows.
- [x] 1.3 Bucket each remaining row by relationship (adjacent forward/backward, overlap extends forward/backward, contained, equal). Compute the corresponding `focusField` (`start_date` or `end_date`).
- [x] 1.4 Pick the closest match (smallest `|existing.start − newStart| + |existing.end − newEnd|`) so the UI shows one most-relevant existing schedule at a time.

## 2. UI

- [x] 2.1 Render an amber info block under the existing cross-pet conflict block. Block names the existing schedule's range and includes a `<button>` "Edit existing schedule →".
- [x] 2.2 Click invokes `onEditExisting?.(existing.id, focusField)` — no internal state mutation; the parent owns the swap.

## 3. Form props

- [x] 3.1 Add `onEditExisting?: (id: number, focusField: 'start_date' | 'end_date') => void` prop on the single-mode form interface.
- [x] 3.2 Add `focusField?: 'start_date' | 'end_date'` prop. On mount, focus the matching date input via a `ref`.

## 4. Parent wiring

- [x] 4.1 In `app/page.tsx`: add `editingFocusField` state, wire the callback to `setEditingSchedule(existing)` + `setEditingFocusField(focus)` after closing the create modal. Pass `focusField={editingFocusField}` to `ScheduleForm`.
- [x] 4.2 Reset `editingFocusField` to `undefined` whenever the modal closes (so a subsequent open without focus intent doesn't re-focus).
- [x] 4.3 No change needed on `app/owners/page.tsx` — its `ScheduleForm` is multi-mode only.

## 5. Translations

- [x] 5.1 Add `schedule.samePetOverlap.{title, description, descriptionAdjacentForward, descriptionAdjacentBackward, editLink}` in `backend/translations/en.json` and `es.json`.

## 6. Specs

- [x] 6.1 Write `openspec/changes/schedule-same-pet-overlap-detection/specs/frontend/schedules/spec.md` — ADDED requirement covering detection, the CTA, the focus-field handoff, and edge cases.
- [x] 6.2 On archive, fold the delta into `openspec/specs/frontend/schedules/spec.md`.

## 7. Verification

- [x] 7.1 `tsc --noEmit` (in `node:24-alpine`) — clean.
- [x] 7.2 `next build` — passes.
- [x] 7.3 Manual:
  - Pick a pet with an existing schedule, pick the day after → block appears, click → focuses end_date.
  - Pick the day before → focuses start_date.
  - Pick a date already covered → block appears, click → focuses end_date.
  - Pick a date well clear of any existing booking → no block.
  - Edit an existing schedule, change dates to overlap a sibling → block appears.
