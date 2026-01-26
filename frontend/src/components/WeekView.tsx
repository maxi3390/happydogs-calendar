'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle, CalendarDays, CalendarRange } from 'lucide-react';
import { api, Schedule } from '@/lib/api';
import ScheduleDetailsPopup from './ScheduleDetailsPopup';

interface WeekViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  calendarView?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
}

export default function WeekView({ selectedDate, onDateSelect, calendarView = 'week', onViewChange }: WeekViewProps) {
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
  }, [currentWeekStart]);

  const getSchedulesForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(s => s.start_date <= dateStr && s.end_date >= dateStr);
  };

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date()));

  const statusColors: Record<string, string> = {
    scheduled: 'border-l-blue-500',
    checked_in: 'border-l-green-500',
    completed: 'border-l-gray-400',
    cancelled: 'border-l-red-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 text-center sm:text-left">
            Week of {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            {onViewChange && (
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 w-full sm:w-auto justify-center">
                <button
                  onClick={() => onViewChange('month')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                    calendarView === 'month'
                      ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  Month
                </button>
                <button
                  onClick={() => onViewChange('week')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none justify-center ${
                    calendarView === 'week'
                      ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <CalendarRange className="w-4 h-4" />
                  Week
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
                This Week
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
        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {weekDays.map(day => {
            const daySchedules = getSchedulesForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={`${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
              >
                <div
                  className={`flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                    isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                  }`}
                  onClick={() => onDateSelect(day)}
                >
                  <div className="w-16 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-2xl font-bold ${
                      isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  <div className="flex-1">
                    {daySchedules.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">No schedules</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {daySchedules.map(schedule => (
                          <button
                            key={schedule.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSchedule(schedule);
                            }}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-l-4 ${statusColors[schedule.status]} ${
                              schedule.conflicts?.length
                                ? 'bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
                            } transition-colors`}
                          >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {schedule.pet_details.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                            </span>
                            {schedule.conflicts && schedule.conflicts.length > 0 && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {daySchedules.length > 0 && (
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        daySchedules.some(s => s.conflicts?.length)
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {daySchedules.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
