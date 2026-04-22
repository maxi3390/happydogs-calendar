# Tasks

## 1. Stay-days helper
- [x] 1.1 Create `frontend/src/domain/schedules/stayDays.ts` exporting `computeStayDays(startDate, endDate, endTime): number`.
- [x] 1.2 Implement with plain `Date.UTC` math so daylight-saving transitions don't shift the count.
- [x] 1.3 Short-circuit single-day stays (`start_date == end_date`) to always return 1.

## 2. Translations
- [x] 2.1 Add `schedule.dayCount.one` and `schedule.dayCount.other` in `backend/translations/en.json` with `{count}` interpolation.
- [x] 2.2 Same in `backend/translations/es.json`.

## 3. Stay-days tag
- [x] 3.1 Render the pill in `DaySchedule.tsx` alongside the conflicts pill in the schedule card header.
- [x] 3.2 Render the same pill in `ScheduleDetailsPopup.tsx` next to the status badge.
- [x] 3.3 Use a primary-tinted palette (`bg-primary/10 text-primary border-primary/20`) so the pill is clearly visible without competing with status badges.
- [x] 3.4 Singular/plural via `t('schedule.dayCount.one'|'schedule.dayCount.other', { count })`.

## 4. Date-format helper + usages
- [x] 4.1 Add `formatIsoDate(iso)` in `frontend/src/lib/dateLocale.ts` — accepts `YYYY-MM-DD`, returns `dd/mm/yyyy`, null-safe.
- [x] 4.2 `ScheduleDetailsPopup.tsx`: format the Date field through `formatIsoDate` (single or range).
- [x] 4.3 `DaySchedule.tsx`: format the `(start to end)` multi-day annotation via `formatIsoDate`.
- [x] 4.4 `OwnerDetailsPopup.tsx`: format `owner.birth_date` via `formatIsoDate`.
- [x] 4.5 `DaySchedule.tsx` header: change the `date-fns` format from `EEEE, MMMM d, yyyy` to `EEEE, dd/MM/yyyy`.
- [x] 4.6 `WeekView.tsx` header: change the `date-fns` format from `MMM d` / `MMM d, yyyy` to `dd/MM` / `dd/MM/yyyy`.

## 5. Specs
- [x] 5.1 `openspec/changes/schedule-days-count/specs/frontend/schedules/spec.md` — days-count rule, dd/mm/yyyy display, visual treatment.
- [x] 5.2 `openspec/changes/schedule-days-count/specs/frontend/owners/spec.md` — owner birth-date dd/mm/yyyy.

## 6. Verification
- [x] 6.1 `tsc --noEmit` — zero errors.
- [x] 6.2 Unit-check `computeStayDays` table (single-day = 1, exactly-noon = not past midday, late checkout adds a day).
- [x] 6.3 Manual: on the calendar, open the day sidebar and a schedule's details popup — verify the tag shows `1 día` for single-day stays regardless of time, and the date fields read `dd/mm/yyyy`.
- [x] 6.4 Manual: open an owner's details popup for an owner with a birth date — verify it reads `dd/mm/yyyy`.
