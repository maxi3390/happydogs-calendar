/**
 * Compute the length of a boarding stay in days.
 *
 * Rule (per the business convention used in the pet nursery):
 *   days = (end_date - start_date)                         // calendar-day diff, checkout day not yet counted
 *        + (end_time > 12:00 ? 1 : 0)                      // count the checkout day only if pickup is past midday
 *
 * Input strings are the ISO values that come off the wire:
 *   - dates:  "YYYY-MM-DD"
 *   - times:  "HH:MM" or "HH:MM:SS"
 *
 * Math uses `Date.UTC` to avoid daylight-saving / local-timezone drift: we
 * only care about the calendar-day diff, not about the wall clock.
 */
export function computeStayDays(
  startDate: string,
  endDate: string,
  endTime: string,
): number {
  if (!startDate || !endDate || !endTime) return 0;

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0;

  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  const dayDiff = Math.max(0, Math.round((endUtc - startUtc) / 86_400_000));

  const [hh = 0, mm = 0] = endTime.split(':').map(Number);
  const pastMidday = hh > 12 || (hh === 12 && mm > 0);

  return dayDiff + (pastMidday ? 1 : 0);
}
