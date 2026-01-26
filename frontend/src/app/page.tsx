'use client';

import { useState } from 'react';
import Calendar from '@/components/Calendar';
import ScheduleForm from '@/components/ScheduleForm';
import MultiPetScheduleForm from '@/components/MultiPetScheduleForm';
import DaySchedule from '@/components/DaySchedule';
import WeekView from '@/components/WeekView';
import Navigation from '@/components/Navigation';
import { Schedule } from '@/lib/api';
import { useTranslation } from '@/lib/translations';

export default function Home() {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [refreshSchedules, setRefreshSchedules] = useState(0);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [showMultiScheduleForm, setShowMultiScheduleForm] = useState(false);

  const handleScheduleSave = () => {
    setShowScheduleForm(false);
    setEditingSchedule(undefined);
    setRefreshSchedules(prev => prev + 1);
  };

  const handleMultiScheduleSave = () => {
    setShowMultiScheduleForm(false);
    setRefreshSchedules(prev => prev + 1);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Navigation
        onNewSchedule={() => {
          setEditingSchedule(undefined);
          setShowScheduleForm(true);
        }}
        onMultiPetSchedule={() => setShowMultiScheduleForm(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Calendar - Shows first on mobile */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {calendarView === 'month' ? (
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                calendarView={calendarView}
                onViewChange={setCalendarView}
              />
            ) : (
              <WeekView
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                calendarView={calendarView}
                onViewChange={setCalendarView}
              />
            )}
          </div>
          {/* Day Schedule - Shows second on mobile */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <DaySchedule
              date={selectedDate}
              onEditSchedule={handleEditSchedule}
              refreshTrigger={refreshSchedules}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-slate-700 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            {t('app.footer')}
          </p>
        </div>
      </footer>

      {showScheduleForm && (
        <ScheduleForm
          schedule={editingSchedule}
          selectedDate={selectedDate}
          onClose={() => {
            setShowScheduleForm(false);
            setEditingSchedule(undefined);
          }}
          onSave={handleScheduleSave}
        />
      )}

      {showMultiScheduleForm && (
        <MultiPetScheduleForm
          selectedDate={selectedDate}
          onClose={() => setShowMultiScheduleForm(false)}
          onSave={handleMultiScheduleSave}
        />
      )}
    </div>
  );
}
