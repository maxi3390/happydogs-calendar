'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarDays, CalendarRange } from 'lucide-react';
import { api, Schedule } from '@/lib/api';
import ScheduleDetailsPopup from './ScheduleDetailsPopup';
import { useTranslation } from '@/lib/translations';
import { getDateLocale } from '@/lib/dateLocale';
import { translateSpecies, translateTemperament } from '@/domain/pets/labels';

interface WeekViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calendarView?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  /** Counter from the parent page that increments on every schedule
   *  mutation (create / edit / delete). Including it in the fetch
   *  effect's dep array re-runs the fetch and refreshes the bars
   *  without forcing the user to navigate between weeks. Optional
   *  so read-only consumers can omit it. */
  refreshTrigger?: number;
}

const BAR_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-700', hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/60' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-300 dark:border-emerald-700', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-800/60' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-700', hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/60' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-700', hover: 'hover:bg-amber-200 dark:hover:bg-amber-800/60' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-800 dark:text-rose-200', border: 'border-rose-300 dark:border-rose-700', hover: 'hover:bg-rose-200 dark:hover:bg-rose-800/60' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-800 dark:text-cyan-200', border: 'border-cyan-300 dark:border-cyan-700', hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/60' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-800 dark:text-indigo-200', border: 'border-indigo-300 dark:border-indigo-700', hover: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/60' },
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-800 dark:text-teal-200', border: 'border-teal-300 dark:border-teal-700', hover: 'hover:bg-teal-200 dark:hover:bg-teal-800/60' },
];

const CONFLICT_BAR = {
  bg: 'bg-amber-50 dark:bg-amber-900/30',
  text: 'text-amber-900 dark:text-amber-100',
  border: 'border-amber-400 dark:border-amber-600',
  hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/50',
};

interface BarLayout {
  schedule: Schedule;
  startCol: number;
  endCol: number;
  startsBeforeWeek: boolean;
  endsAfterWeek: boolean;
}

export default function WeekView({ selectedDate, onDateSelect, calendarView = 'week', onViewChange, refreshTrigger = 0 }: WeekViewProps) {
  const { t, language } = useTranslation();
  const dateLocale = getDateLocale(language);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(selectedDate));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const weekEnd = endOfWeek(currentWeekStart);
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const start = format(currentWeekStart, 'yyyy-MM-dd');
        const end = format(weekEnd, 'yyyy-MM-dd');
        const data = await api.schedules.list({ start_date: start, end_date: end });
        setSchedules(data);
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
    // `refreshTrigger` re-runs the fetch after the parent records a
    // schedule mutation (create / edit / delete). Same pattern as the
    // monthly Calendar component.
  }, [currentWeekStart, refreshTrigger]);

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today));
    onDateSelect(today);
  };

  const petRows = useMemo(() => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const dayStrings = weekDays.map(d => format(d, 'yyyy-MM-dd'));

    const uniqueSchedules = new Map<number, Schedule>();
    schedules.forEach(s => uniqueSchedules.set(s.id, s));

    const byPet = new Map<number, { petName: string; petDetails: Schedule['pet_details']; bars: BarLayout[] }>();

    uniqueSchedules.forEach(s => {
      if (!byPet.has(s.pet)) {
        byPet.set(s.pet, { petName: s.pet_details.name, petDetails: s.pet_details, bars: [] });
      }

      const startsBeforeWeek = s.start_date < weekStartStr;
      const endsAfterWeek = s.end_date > weekEndStr;

      let startCol = 0;
      if (!startsBeforeWeek) {
        const idx = dayStrings.indexOf(s.start_date);
        if (idx !== -1) startCol = idx;
      }

      let endCol = 6;
      if (!endsAfterWeek) {
        const idx = dayStrings.indexOf(s.end_date);
        if (idx !== -1) endCol = idx;
      }

      byPet.get(s.pet)!.bars.push({ schedule: s, startCol, endCol, startsBeforeWeek, endsAfterWeek });
    });

    byPet.forEach(group => {
      group.bars.sort((a, b) => a.startCol - b.startCol || a.schedule.start_date.localeCompare(b.schedule.start_date));
    });

    const result = Array.from(byPet.entries()).map(([petId, group]) => ({
      petId,
      ...group,
    }));
    result.sort((a, b) => a.petName.localeCompare(b.petName));
    return result;
  }, [schedules, currentWeekStart, weekEnd, weekDays]);

  const petColorMap = useMemo(() => {
    const map = new Map<number, number>();
    petRows.forEach((row, i) => map.set(row.petId, i % BAR_COLORS.length));
    return map;
  }, [petRows]);

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-lg overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 text-center sm:text-left">
            {t('calendar.weekOf')} {format(currentWeekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
          </h3>
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
                onClick={goToPreviousWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToCurrentWeek}
                className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              >
                {t('calendar.thisWeek')}
              </button>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Day column headers */}
            <div className="grid border-b border-border" style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}>
              <div className="p-2 border-r border-border" />
              {weekDays.map(day => {
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r last:border-r-0 border-border cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/50 transition-colors ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => onDateSelect(day)}
                  >
                    <p className="text-xs text-muted-foreground uppercase">{format(day, 'EEE', { locale: dateLocale })}</p>
                    <p className={`text-lg font-bold ${
                      isToday ? 'text-primary' : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Pet schedule rows */}
            {petRows.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-muted-foreground italic">
                {t('schedule.noSchedules')}
              </div>
            ) : (
              petRows.map(row => {
                const colorIdx = petColorMap.get(row.petId) ?? 0;
                return (
                  <div
                    key={row.petId}
                    className="grid border-b last:border-b-0 border-gray-100 dark:border-slate-700"
                    style={{ gridTemplateColumns: '110px repeat(7, 1fr)' }}
                  >
                    {/* Pet name label */}
                    <div className="p-2 border-r border-border flex items-center min-h-[44px]">
                      <div className="truncate">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{row.petName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {translateSpecies(t, row.petDetails.species)} · {translateTemperament(t, row.petDetails.temperament)}
                        </p>
                      </div>
                    </div>

                    {/* Schedule bars area - 7 columns */}
                    <div className="col-span-7 relative min-h-[44px]">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 grid grid-cols-7 pointer-events-none" aria-hidden>
                        {weekDays.map((_, i) => (
                          <div key={i} className={`border-r border-gray-100 dark:border-slate-700/50 ${i === 6 ? 'border-r-0' : ''}`} />
                        ))}
                      </div>

                      {/* Bars using CSS grid for automatic stacking */}
                      <div className="grid grid-cols-7 gap-y-0.5 py-1.5 px-0.5 relative">
                        {row.bars.map(bar => {
                          const hasConflicts = bar.schedule.conflicts && bar.schedule.conflicts.length > 0;
                          const color = hasConflicts ? CONFLICT_BAR : BAR_COLORS[colorIdx];

                          const roundedLeft = bar.startsBeforeWeek ? 'rounded-l-sm' : 'rounded-l-full';
                          const roundedRight = bar.endsAfterWeek ? 'rounded-r-sm' : 'rounded-r-full';

                          return (
                            <button
                              key={bar.schedule.id}
                              onClick={() => setSelectedSchedule(bar.schedule)}
                              className={`h-7 flex items-center gap-1.5 px-2.5 text-xs font-medium truncate border transition-colors cursor-pointer ${roundedLeft} ${roundedRight} ${color.bg} ${color.text} ${color.border} ${color.hover}`}
                              style={{ gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}` }}
                              title={`${bar.schedule.pet_details.name} — ${bar.schedule.start_date} to ${bar.schedule.end_date} (${bar.schedule.start_time.slice(0, 5)}–${bar.schedule.end_time.slice(0, 5)})`}
                            >
                              <span className="truncate">{bar.schedule.pet_details.name}</span>
                              <span className="opacity-60 whitespace-nowrap text-[10px]">
                                {bar.schedule.start_time.slice(0, 5)}–{bar.schedule.end_time.slice(0, 5)}
                              </span>
                              {hasConflicts && (
                                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
