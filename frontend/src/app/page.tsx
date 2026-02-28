'use client';

import { useState } from 'react';
import Link from 'next/link';
import Calendar from '@/components/Calendar';
import ScheduleForm from '@/components/ScheduleForm';
import DaySchedule from '@/components/DaySchedule';
import WeekView from '@/components/WeekView';
import Navigation from '@/components/Navigation';
import PublicCalendar from '@/components/PublicCalendar';
import { Schedule } from '@/lib/api';
import { useTranslation } from '@/lib/translations';
import { useAuth } from '@/lib/auth';
import { LogIn, PawPrint, Shield } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin, user, isLoading } = useAuth();
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <PawPrint className="w-16 h-16 text-indigo-500" />
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Public view for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        {/* Public Header */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-indigo-100 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-600 dark:bg-indigo-500">
                  <PawPrint className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{t('app.name')}</h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('app.tagline')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('auth.signIn')}</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 text-white py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">{t('public.welcome') || 'Welcome to Happy Pet Nursery'}</h2>
            <p className="text-indigo-100 dark:text-indigo-200 max-w-2xl mx-auto">
              {t('public.description') || 'View our availability calendar below. Sign in to manage schedules and access all features.'}
            </p>
          </div>
        </div>

        {/* Public Calendar */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {t('public.availabilityCalendar') || 'Availability Calendar'}
            </h3>
            <PublicCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Call to Action */}
          <div className="mt-8 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {t('public.ctaTitle') || 'Want to schedule your pet?'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('public.ctaDescription') || 'Sign in to create schedules, manage pets, and access all features.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  {t('auth.signIn')}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
                >
                  {t('auth.signUp')}
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-gray-200 dark:border-slate-700 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('app.footer')}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated view - full featured based on role
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Navigation
        onNewSchedule={() => {
          setEditingSchedule(undefined);
          setShowScheduleForm(true);
        }}
        onMultiPetSchedule={() => setShowMultiScheduleForm(true)}
      />

      {/* Role indicator banner for admins */}
      {isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {t('public.adminMode') || 'Admin Mode'}: {t('public.fullAccess') || 'You have full access to all features'}
            </p>
          </div>
        </div>
      )}

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
        <ScheduleForm
          mode="multi"
          selectedDate={selectedDate}
          onClose={() => setShowMultiScheduleForm(false)}
          onSave={handleMultiScheduleSave}
        />
      )}
    </div>
  );
}
