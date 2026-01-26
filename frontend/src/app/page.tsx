'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PawPrint, CalendarDays, Users, UsersRound, Menu, X, Plus } from 'lucide-react';
import Calendar from '@/components/Calendar';
import ScheduleForm from '@/components/ScheduleForm';
import MultiPetScheduleForm from '@/components/MultiPetScheduleForm';
import DaySchedule from '@/components/DaySchedule';
import WeekView from '@/components/WeekView';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-indigo-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-indigo-600 dark:bg-indigo-500 rounded-lg sm:rounded-xl">
                <PawPrint className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{t('app.name')}</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('app.tagline')}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link
                href="/owners"
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm"
              >
                <Users className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('nav.owners')}</span>
              </Link>
              <Link
                href="/pets"
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm text-sm"
              >
                <PawPrint className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('nav.pets')}</span>
              </Link>
              <button
                onClick={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(true);
                }}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm text-sm"
              >
                <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('nav.newSchedule')}</span>
              </button>
              <button
                onClick={() => setShowMultiScheduleForm(true)}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors shadow-sm text-sm"
              >
                <UsersRound className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('nav.multiPet')}</span>
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(true);
                }}
                className="p-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex flex-col gap-2">
                <Link
                  href="/owners"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  <Users className="w-5 h-5" />
                  {t('nav.owners')}
                </Link>
                <Link
                  href="/pets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg"
                >
                  <PawPrint className="w-5 h-5" />
                  {t('nav.pets')}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setEditingSchedule(undefined);
                    setShowScheduleForm(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg"
                >
                  <CalendarDays className="w-5 h-5" />
                  {t('nav.newSchedule')}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowMultiScheduleForm(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg"
                >
                  <UsersRound className="w-5 h-5" />
                  {t('multiPet.title')}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

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
