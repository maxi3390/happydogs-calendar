'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { getDateLocale } from '@/lib/dateLocale';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface PublicCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

interface DayAvailability {
  date: string;
  totalSchedules: number;
  hasAvailability: boolean;
}

export default function PublicCalendar({ selectedDate, onDateSelect }: PublicCalendarProps) {
  const { t, language } = useTranslation();
  const dateLocale = getDateLocale(language);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({});
  const [loading, setLoading] = useState(false);

  const dayNames = [
    t('calendar.daysShort.sun') || 'S',
    t('calendar.daysShort.mon') || 'M',
    t('calendar.daysShort.tue') || 'T',
    t('calendar.daysShort.wed') || 'W',
    t('calendar.daysShort.thu') || 'T',
    t('calendar.daysShort.fri') || 'F',
    t('calendar.daysShort.sat') || 'S',
  ];

  useEffect(() => {
    fetchAvailability();
  }, [currentMonth]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const response = await fetch(
        `${API_BASE}/schedules/?start_date=${startDate}&end_date=${endDate}`
      );

      if (response.ok) {
        const schedules = await response.json();
        const availabilityMap: Record<string, DayAvailability> = {};

        // Count schedules per day
        schedules.forEach((schedule: any) => {
          const date = schedule.start_date;
          if (!availabilityMap[date]) {
            availabilityMap[date] = {
              date,
              totalSchedules: 0,
              hasAvailability: true,
            };
          }
          availabilityMap[date].totalSchedules++;
        });

        // Mark days with many schedules as less available
        Object.keys(availabilityMap).forEach(date => {
          availabilityMap[date].hasAvailability = availabilityMap[date].totalSchedules < 10;
        });

        setAvailability(availabilityMap);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
    setLoading(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAvailabilityIndicator = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayAvailability = availability[dateStr];
    const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

    if (isPast) {
      return null;
    }

    if (!dayAvailability || dayAvailability.totalSchedules === 0) {
      return (
        <div className="mt-1 flex justify-center">
          <span className="w-2 h-2 bg-green-500 rounded-full" title={t('public.available') || 'Available'}></span>
        </div>
      );
    }

    if (dayAvailability.hasAvailability) {
      return (
        <div className="mt-1 flex justify-center">
          <span className="w-2 h-2 bg-yellow-500 rounded-full" title={t('public.limitedAvailability') || 'Limited availability'}></span>
        </div>
      );
    }

    return (
      <div className="mt-1 flex justify-center">
        <span className="w-2 h-2 bg-red-500 rounded-full" title={t('public.busy') || 'Busy'}></span>
      </div>
    );
  };

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              disabled={!isCurrentMonth}
              className={`
                aspect-square p-1 rounded-lg transition-all text-sm
                ${!isCurrentMonth ? 'text-gray-300 dark:text-muted-foreground cursor-default' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}
                ${isSelected ? 'bg-primary hover:bg-primary/90 text-white hover:bg-indigo-700' : ''}
                ${isToday && !isSelected ? 'ring-2 ring-indigo-400 dark:ring-ring' : ''}
                ${isCurrentMonth && !isSelected ? 'text-gray-700 dark:text-gray-300' : ''}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className={isSelected ? 'font-semibold' : ''}>
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && getAvailabilityIndicator(day)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{t('public.available') || 'Available'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            <span>{t('public.limitedAvailability') || 'Limited'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span>{t('public.busy') || 'Busy'}</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-card text-card-foreground/50 dark:bg-slate-800/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}
