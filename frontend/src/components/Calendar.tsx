'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { api, Schedule } from '@/lib/api';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

export default function Calendar({ onDateSelect, selectedDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
        const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
        const data = await api.schedules.list({ start_date: start, end_date: end });
        setSchedules(data);
      } catch (error) {
        console.error('Failed to fetch schedules:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [currentMonth]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getSchedulesForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(s => s.date === dateStr);
  };

  const hasConflicts = (day: Date) => {
    const daySchedules = getSchedulesForDay(day);
    return daySchedules.some(s => s.conflicts && s.conflicts.length > 0);
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24" />
        ))}

        {days.map(day => {
          const daySchedules = getSchedulesForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const dayHasConflicts = hasConflicts(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`h-24 p-1 rounded-lg border transition-all text-left ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
              } ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                    isToday
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayHasConflicts && (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {daySchedules.slice(0, 2).map(schedule => (
                  <div
                    key={schedule.id}
                    className={`text-xs px-1.5 py-0.5 rounded truncate ${
                      schedule.conflicts?.length
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {schedule.pet_details.name}
                  </div>
                ))}
                {daySchedules.length > 2 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{daySchedules.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}
    </div>
  );
}
