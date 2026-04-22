# Tasks

## 1. Helper
- [x] 1.1 Create `frontend/src/domain/schedules/stayDays.ts` exporting `computeStayDays(startDate, endDate, endTime): number`.
- [x] 1.2 Implement with plain `Date` math (`Date.UTC` based date diff + an `end_time > 12:00` check) so daylight-saving transitions don't shift the count.

## 2. Translations
- [x] 2.1 Add `schedule.dayCount.one` and `schedule.dayCount.other` in `backend/translations/en.json` with `{count}` interpolation.
- [x] 2.2 Same in `backend/translations/es.json`.

## 3. UI
- [x] 3.1 In `DaySchedule.tsx`, render a small pill next to the existing conflicts pill in the schedule card header. Use a muted palette (`bg-secondary/40 text-muted-foreground`) to read as metadata rather than a state.
- [x] 3.2 In `ScheduleDetailsPopup.tsx`, render the same pill immediately to the right of the status badge row.
- [x] 3.3 Both tags select singular vs plural via `t('schedule.dayCount.one'|'schedule.dayCount.other', { count })`.

## 4. Verification
- [x] 4.1 `tsc --noEmit` — zero errors.
- [x] 4.2 Manual: open the calendar, pick a multi-day schedule that ends before noon and one that ends after noon — verify the days tag is off-by-one between them.
- [x] 4.3 Manual: open the Schedule Details popup for each — verify the same pill appears and the copy matches the sidebar.

## 5. Spec
- [x] 5.1 Write `openspec/changes/schedule-days-count/specs/frontend/schedules/spec.md` (MODIFIED delta) describing the rule + where the tag renders.
