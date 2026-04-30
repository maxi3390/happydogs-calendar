'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, CalendarRange, Minus } from 'lucide-react';
import { api, Schedule } from '@/lib/api';
import ScheduleDetailsPopup from './ScheduleDetailsPopup';
import { useTranslation } from '@/lib/translations';
import { getDateLocale } from '@/lib/dateLocale';
import { useResourceList } from '@/hooks/useResourceList';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
  calendarView?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  /** Counter from the parent page that increments on every schedule
   *  mutation (create / edit / delete). Including it in the fetch
   *  effect's dep array re-runs the fetch and refreshes the bars
   *  without forcing the user to navigate between months. Optional
   *  so `PublicCalendar` (and any future read-only consumer) can
   *  omit it and keep the fetch driven only by period changes. */
  refreshTrigger?: number;
}

const BAR_COLORS = [
  { bg: 'bg-blue-200 dark:bg-blue-800/60', text: 'text-blue-900 dark:text-blue-100', hover: 'hover:bg-blue-300 dark:hover:bg-blue-700/70' },
  { bg: 'bg-emerald-200 dark:bg-emerald-800/60', text: 'text-emerald-900 dark:text-emerald-100', hover: 'hover:bg-emerald-300 dark:hover:bg-emerald-700/70' },
  { bg: 'bg-purple-200 dark:bg-purple-800/60', text: 'text-purple-900 dark:text-purple-100', hover: 'hover:bg-purple-300 dark:hover:bg-purple-700/70' },
  { bg: 'bg-rose-200 dark:bg-rose-800/60', text: 'text-rose-900 dark:text-rose-100', hover: 'hover:bg-rose-300 dark:hover:bg-rose-700/70' },
  { bg: 'bg-cyan-200 dark:bg-cyan-800/60', text: 'text-cyan-900 dark:text-cyan-100', hover: 'hover:bg-cyan-300 dark:hover:bg-cyan-700/70' },
  { bg: 'bg-indigo-200 dark:bg-indigo-800/60', text: 'text-indigo-900 dark:text-indigo-100', hover: 'hover:bg-indigo-300 dark:hover:bg-indigo-700/70' },
  { bg: 'bg-teal-200 dark:bg-teal-800/60', text: 'text-teal-900 dark:text-teal-100', hover: 'hover:bg-teal-300 dark:hover:bg-teal-700/70' },
  { bg: 'bg-orange-200 dark:bg-orange-800/60', text: 'text-orange-900 dark:text-orange-100', hover: 'hover:bg-orange-300 dark:hover:bg-orange-700/70' },
];

const CONFLICT_COLOR = {
  bg: 'bg-amber-300 dark:bg-amber-700/70',
  text: 'text-amber-900 dark:text-amber-100',
  hover: 'hover:bg-amber-400 dark:hover:bg-amber-600/80',
};

interface WeekBarSegment {
  schedule: Schedule;
  startCol: number;   // 0-6 within the week row
  endCol: number;     // 0-6 within the week row
  continuesLeft: boolean;
  continuesRight: boolean;
  row: number;        // stacking row within the week
}

// Maximum number of bar rows shown inside a day cell when the week is
// collapsed (the default). When more schedules exist on a single day,
// the cell shows MAX_VISIBLE_BARS bars plus a "+N more" indicator on
// the row directly below, for a total of MAX_VISIBLE_BARS + 1 = 4
// rows of content.
//
// Clicking "+N more" expands that week in place: the bar overlay row
// grows tall enough to hold every segment, and a "Show less" footer
// rolls it back to the 4-row default. The cap only applies to the
// data-driven default — explicit user expansion is still allowed so
// no schedule is hidden.
const MAX_VISIBLE_BARS = 3;
const CELL_BAR_ROWS = MAX_VISIBLE_BARS + 1;
// Vertical space reserved for the day-number badge inside each cell.
// Slightly taller than the badge itself (~24 px) so the day number
// has comfortable breathing room above the bar area.
const DAY_NUMBER_AREA_PX = 32;
// Default pixel height of the bar overlay row when the week is
// collapsed. Carries CELL_BAR_ROWS bar rows plus a small bottom gap
// so the last bar doesn't touch the next week's border.
const BAR_AREA_PX = CELL_BAR_ROWS * 22 + 4;

export default function Calendar({ onDateSelect, selectedDate, calendarView = 'month', onViewChange, refreshTrigger = 0 }: CalendarProps) {
  const { t, language } = useTranslation();
  const dateLocale = getDateLocale(language);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  // Expansion state is per-week-index; navigating to a different
  // month invalidates those indices, so reset.
  useEffect(() => {
    setExpandedWeeks(new Set());
  }, [currentMonth]);

  const toggleWeek = (weekIdx: number, expand: boolean) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (expand) next.add(weekIdx);
      else next.delete(weekIdx);
      return next;
    });
  };

  // Memoize against `currentMonth` so the four derived dates keep a
  // stable identity across renders. Otherwise useEffect / useMemo
  // dependents would treat each render's freshly-constructed Date as
  // a new value and run forever (the schedules fetch in particular
  // would loop the page into a never-idle network state).
  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  // Stretch the visible grid to whole weeks: the first row reaches
  // back to the previous month's tail, the last row reaches into the
  // next month's head. This matches PublicCalendar and makes the
  // grid look complete (no blank cells in the first / last rows).
  const calendarStart = useMemo(() => startOfWeek(monthStart), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd), [monthEnd]);

  // Fetch over the WHOLE visible window — including the leading /
  // trailing days from adjacent months — so a schedule that starts on
  // Mar 30 and ends Apr 5 still renders its bar in April's first row.
  const { items: schedules, loading } = useResourceList<Schedule>(
    () => api.schedules.list({
      start_date: format(calendarStart, 'yyyy-MM-dd'),
      end_date: format(calendarEnd, 'yyyy-MM-dd'),
    }),
    [calendarStart, calendarEnd, refreshTrigger],
  );

  // Build calendar grid: every cell is a real Date — no nulls. The
  // out-of-month leading / trailing days are rendered with reduced
  // opacity and no click handler (matching PublicCalendar).
  const weeks = useMemo(() => {
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const grid: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      grid.push(days.slice(i, i + 7));
    }
    return grid;
  }, [calendarStart, calendarEnd]);

  // Deduplicate schedules and assign stable colors per pet
  const uniqueSchedules = useMemo(() => {
    const map = new Map<number, Schedule>();
    schedules.forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [schedules]);

  const petColorMap = useMemo(() => {
    const petIds = [...new Set(uniqueSchedules.map(s => s.pet))].sort((a, b) => a - b);
    const map = new Map<number, number>();
    petIds.forEach((id, i) => map.set(id, i % BAR_COLORS.length));
    return map;
  }, [uniqueSchedules]);

  // For each week row, compute bar segments with stacking
  const weekBars = useMemo(() => {
    return weeks.map(week => {
      // Every cell is a real Date (the grid stretches to whole
      // weeks), so first and last are simply the row endpoints.
      const weekDayStrs = week.map(d => format(d, 'yyyy-MM-dd'));
      const firstDayStr = weekDayStrs[0];
      const lastDayStr = weekDayStrs[weekDayStrs.length - 1];

      // Find schedules that overlap with this week
      const overlapping = uniqueSchedules.filter(s =>
        s.start_date <= lastDayStr && s.end_date >= firstDayStr
      );

      // Sort by actual range (greater first), then by start date.
      // The previous `localeCompare` form only distinguished single-day
      // from multi-day, which let a 4-day Wed-Sat schedule lose its
      // visible row to a 3-day Wed-Fri schedule that happened to come
      // first in the API order.
      const rangeDays = (s: Schedule) =>
        Math.round((Date.parse(s.end_date) - Date.parse(s.start_date)) / 86400000);
      overlapping.sort((a, b) => {
        const diff = rangeDays(b) - rangeDays(a);
        if (diff !== 0) return diff;
        return a.start_date.localeCompare(b.start_date);
      });

      const segments: WeekBarSegment[] = [];
      // Track which rows are occupied at each column
      const occupied: number[][] = Array.from({ length: 7 }, () => []);

      overlapping.forEach(s => {
        let startCol = 0;
        let endCol = 6;
        let continuesLeft = false;
        let continuesRight = false;

        // Find the first column where this schedule starts (or 0 if before week)
        if (s.start_date <= firstDayStr) {
          startCol = weekDayStrs.indexOf(firstDayStr);
          continuesLeft = s.start_date < firstDayStr;
        } else {
          const idx = weekDayStrs.indexOf(s.start_date);
          if (idx !== -1) startCol = idx;
        }

        // Find the last column where this schedule ends (or 6 if after week)
        if (s.end_date >= lastDayStr) {
          endCol = weekDayStrs.lastIndexOf(lastDayStr);
          continuesRight = s.end_date > lastDayStr;
        } else {
          const idx = weekDayStrs.indexOf(s.end_date);
          if (idx !== -1) endCol = idx;
        }

        // Find the first row that's free across the entire span
        let row = 0;
        while (true) {
          let free = true;
          for (let c = startCol; c <= endCol; c++) {
            if (occupied[c].includes(row)) {
              free = false;
              break;
            }
          }
          if (free) break;
          row++;
        }

        // Mark occupied
        for (let c = startCol; c <= endCol; c++) {
          occupied[c].push(row);
        }

        segments.push({ schedule: s, startCol, endCol, continuesLeft, continuesRight, row });
      });

      // `dayHiddenCounts` counts segments per day that landed at
      // row >= MAX_VISIBLE_BARS. Used directly by the "+N more"
      // indicator. Computing it from a column's total bar count
      // would be wrong: a single-day segment that fell to a high
      // row because of overlaps on OTHER days isn't visible on
      // that column despite the column itself only having one bar.
      const dayHiddenCounts = Array(7).fill(0) as number[];
      segments.forEach(seg => {
        if (seg.row < MAX_VISIBLE_BARS) return;
        for (let c = seg.startCol; c <= seg.endCol; c++) {
          dayHiddenCounts[c]++;
        }
      });

      return { segments, dayHiddenCounts };
    });
  }, [weeks, uniqueSchedules]);

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-lg p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 text-center sm:text-left">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          {onViewChange && (
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto justify-center">
              <button
                onClick={() => onViewChange('month')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                  calendarView === 'month'
                    ? 'bg-card text-card-foreground dark:bg-slate-600 text-primary dark:text-white shadow-sm'
                    : 'text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                {t('calendar.month')}
              </button>
              <button
                onClick={() => onViewChange('week')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                  calendarView === 'week'
                    ? 'bg-card text-card-foreground dark:bg-slate-600 text-primary dark:text-white shadow-sm'
                    : 'text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                {t('calendar.week')}
              </button>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label={t('calendar.previousMonth')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                onDateSelect(today);
              }}
              className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
            >
              {t('calendar.today')}
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label={t('calendar.nextMonth')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, i) => (
          <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1.5 sm:py-2 border-r last:border-r-0 border-gray-100 dark:border-slate-700/50">
            <span className="sm:hidden">{t(`calendar.daysShort.${day}`)}</span>
            <span className="hidden sm:inline">{t(`calendar.days.${day}`)}</span>
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => {
        const { segments, dayHiddenCounts } = weekBars[weekIdx];
        const expanded = expandedWeeks.has(weekIdx);
        const weekHasHidden = dayHiddenCounts.some(c => c > 0);
        const visibleSegments = expanded
          ? segments
          : segments.filter(s => s.row < MAX_VISIBLE_BARS);
        // Bar overlay row height: when collapsed, the constant 4-row
        // default; when expanded, just enough to fit every segment so
        // no schedule stays hidden.
        const expandedRows = segments.reduce(
          (max, s) => Math.max(max, s.row + 1),
          0,
        );
        const barAreaPx = expanded ? expandedRows * 22 + 4 : BAR_AREA_PX;

        return (
          <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0 border-gray-100 dark:border-slate-700/50">
            {/* Day number row */}
            {week.map((day, colIdx) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = isSameDay(day, selectedDate);
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={colIdx}
                  className={`border-r last:border-r-0 border-gray-100 dark:border-slate-700/50 pt-1 px-0.5 sm:px-1 transition-colors ${
                    inMonth ? 'cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/30' : ''
                  } ${isSelected && inMonth ? 'bg-primary/10/50 dark:bg-indigo-900/10' : ''} ${
                    !inMonth ? 'opacity-50' : ''
                  }`}
                  // Out-of-month days are visible (so the grid looks
                  // complete) but not clickable for selection — same
                  // contract PublicCalendar uses. The user navigates
                  // months via the chevron buttons.
                  onClick={inMonth ? () => onDateSelect(day) : undefined}
                  // The cell only owns the day-number area. The bar
                  // area (CELL_BAR_ROWS rows) lives in the col-span-7
                  // overlay rendered below this row — including it
                  // here too would double the height of every week.
                  style={{ minHeight: `${DAY_NUMBER_AREA_PX}px` }}
                >
                  <div className="flex items-center justify-center sm:justify-start">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs sm:text-sm font-medium ${
                        isToday
                          ? 'bg-primary hover:bg-primary/90 dark:bg-primary hover:bg-primary/90 text-white font-bold'
                          : isSelected && inMonth
                            ? 'text-primary font-semibold'
                            : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Schedule bar overlay row.
                Layout is intentionally flat:
                  - 7 in-flow backdrop divs (one per column) own the
                    row's height, the right borders, the hover/select
                    tint, and the click handler that selects the day.
                  - Schedule bars are absolute siblings positioned by
                    percentage across the grid container.
                  - "+N more" indicators are also absolute siblings.
                Keeping bars / indicators as direct siblings of the
                backdrops (instead of nested in a pointer-events-none
                wrapper) keeps clicks reliable on every interactive
                child without relying on event-pass-through tricks. */}
            <div className="col-span-7 grid grid-cols-7 relative">
              {week.map((day, colIdx) => {
                const isSelected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <div
                    key={`backdrop-${colIdx}`}
                    // Stable selector for E2E tests: click a day cell to
                    // surface the DaySchedule panel. Out-of-month cells
                    // are not interactive and intentionally not labelled.
                    data-testid={inMonth ? `calendar-day-${format(day, 'yyyy-MM-dd')}` : undefined}
                    onClick={inMonth ? () => onDateSelect(day) : undefined}
                    className={`border-r last:border-r-0 border-gray-100 dark:border-slate-700/50 transition-colors ${
                      inMonth ? 'cursor-pointer hover:bg-muted/30 dark:hover:bg-slate-700/20' : ''
                    } ${isSelected && inMonth ? 'bg-primary/10/50 dark:bg-indigo-900/10' : ''} ${
                      !inMonth ? 'opacity-50' : ''
                    }`}
                    style={{ minHeight: `${barAreaPx}px` }}
                  />
                );
              })}

              {visibleSegments.map(seg => {
                const hasConflicts = seg.schedule.conflicts && seg.schedule.conflicts.length > 0;
                const colorIdx = petColorMap.get(seg.schedule.pet) ?? 0;
                const color = hasConflicts ? CONFLICT_COLOR : BAR_COLORS[colorIdx];

                const roundedLeft = seg.continuesLeft ? 'rounded-l-none' : 'rounded-l-md';
                const roundedRight = seg.continuesRight ? 'rounded-r-none' : 'rounded-r-md';

                const left = `${(seg.startCol / 7) * 100}%`;
                const width = `${((seg.endCol - seg.startCol + 1) / 7) * 100}%`;
                const top = seg.row * 22;

                return (
                  <button
                    key={`${seg.schedule.id}-${weekIdx}-${seg.startCol}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSchedule(seg.schedule);
                    }}
                    className={`absolute h-[18px] flex items-center px-1 sm:px-1.5 text-[10px] sm:text-xs font-medium truncate transition-colors cursor-pointer ${roundedLeft} ${roundedRight} ${color.bg} ${color.text} ${color.hover}`}
                    style={{
                      left: `calc(${left} + ${seg.continuesLeft ? 0 : 2}px)`,
                      width: `calc(${width} - ${(seg.continuesLeft ? 0 : 2) + (seg.continuesRight ? 0 : 2)}px)`,
                      top: `${top}px`,
                    }}
                    title={`${seg.schedule.pet_details.name} — ${seg.schedule.start_date} to ${seg.schedule.end_date}`}
                  >
                    {hasConflicts && (
                      <AlertTriangle className="w-2.5 h-2.5 mr-0.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{seg.schedule.pet_details.name}</span>
                  </button>
                );
              })}

              {/* "+N more" indicator (only when collapsed). Clicking
                  expands the week in place so every hidden schedule
                  becomes visible. */}
              {!expanded && week.map((_day, colIdx) => {
                const hiddenCount = dayHiddenCounts[colIdx];
                if (hiddenCount <= 0) return null;

                return (
                  <button
                    key={`more-${colIdx}`}
                    type="button"
                    aria-label={t('calendar.more').replace('{count}', String(hiddenCount))}
                    className="absolute text-[10px] sm:text-xs text-muted-foreground font-medium px-1 sm:px-1.5 cursor-pointer hover:text-primary dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm bg-card dark:bg-slate-800"
                    style={{
                      left: `${(colIdx / 7) * 100}%`,
                      top: `${MAX_VISIBLE_BARS * 22}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWeek(weekIdx, true);
                    }}
                  >
                    +{hiddenCount} {t('calendar.more').replace('+{count} ', '').replace('{count} ', '')}
                  </button>
                );
              })}
            </div>

            {/* Show-less footer (only when expanded AND the week
                actually had something hidden, so a fully-empty week
                never sprouts a "Show less" link). */}
            {expanded && weekHasHidden && (
              <div className="col-span-7 flex justify-end px-1 pb-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleWeek(weekIdx, false); }}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground hover:text-primary dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-sm px-1.5 py-0.5"
                >
                  <Minus className="w-3 h-3" />
                  {t('calendar.showLess')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {loading && (
        <div className="absolute inset-0 bg-card text-card-foreground/50 dark:bg-slate-900/50 flex items-center justify-center rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
        </div>
      )}

      {selectedSchedule && (
        <ScheduleDetailsPopup
          schedule={selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
        />
      )}
    </div>
  );
}
