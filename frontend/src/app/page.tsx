'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>();
  const [refreshSchedules, setRefreshSchedules] = useState(0);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [showMultiScheduleForm, setShowMultiScheduleForm] = useState(false);

  // The global "New Schedule" nav shortcut routes to /?new=1 from other
  // pages. Detect it here (via window.location so we don't need a
  // Suspense boundary the way useSearchParams does), auto-open the
  // modal, and scrub the query param so reloading doesn't re-open it.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setShowScheduleForm(true);
      router.replace('/');
    }
  }, [isAuthenticated, router]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <PawPrint className="w-20 h-20 text-primary relative z-10" />
          </div>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Public view for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background selection:bg-primary/20">
        {/* Public Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <PawPrint className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">{t('app.name')}</h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide hidden sm:block">{t('app.tagline')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/30 p-1.5 rounded-2xl border border-border/50">
                <LanguageSwitcher />
                <ThemeToggle />
                <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
                <Link
                  href="/login"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm font-medium"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.signIn')}</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-background pt-16 pb-24 sm:pt-24 sm:pb-32 border-b border-border">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
            <div className="w-96 h-96 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
            <div className="w-[30rem] h-[30rem] bg-primary hover:bg-primary/90/10 dark:bg-primary hover:bg-primary/90/5 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              {t('public.welcome') || 'Welcome to Happy Pet Nursery'}
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              {t('public.description') || 'View our availability calendar below. Sign in to manage schedules and access all features in a premium environment.'}
            </p>
            <div className="sm:hidden flex justify-center mb-8">
               <Link
                  href="/login"
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{t('auth.signIn')}</span>
                </Link>
            </div>
          </div>
        </div>

        {/* Public Calendar */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 pb-20">
          <div className="bg-card rounded-3xl shadow-xl shadow-border/10 border border-border/50 p-6 sm:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {t('public.availabilityCalendar') || 'Live Availability Calendar'}
              </h3>
            </div>
            <div className="bg-background rounded-2xl border border-border/50 p-2 sm:p-4">
              <PublicCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center max-w-2xl mx-auto">
            <div className="bg-card rounded-3xl shadow-lg border border-border/50 p-8 sm:p-12 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h3 className="text-2xl font-bold text-foreground mb-4">
                {t('public.ctaTitle') || 'Ready to join the family?'}
              </h3>
              <p className="text-muted-foreground mb-8 text-lg">
                {t('public.ctaDescription') || 'Create an account to manage your pets and schedule visits instantly.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold"
                >
                  <LogIn className="w-5 h-5" />
                  {t('auth.signIn')}
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl transition-all font-semibold"
                >
                  {t('auth.signUp')}
                </Link>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-center text-muted-foreground text-sm font-medium tracking-wide">
              {t('app.footer')}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated view - full featured based on role
  return (
    <div className="min-h-screen bg-background">
      <Navigation
        onMultiPetSchedule={() => setShowMultiScheduleForm(true)}
      />

      {/* Role indicator banner for admins */}
      {isAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="uppercase tracking-wider">{t('public.adminMode') || 'Admin Mode'}:</span>
              {t('public.fullAccess') || 'You have full access to all features'}
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* Calendar - Shows first on mobile */}
          <div className="lg:col-span-8 order-1 lg:order-1">
            <div className="bg-card rounded-3xl shadow-sm border border-border/60 p-4 sm:p-6 h-full transition-all duration-300 hover:shadow-md">
              {calendarView === 'month' ? (
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  calendarView={calendarView}
                  onViewChange={setCalendarView}
                  refreshTrigger={refreshSchedules}
                />
              ) : (
                <WeekView
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  calendarView={calendarView}
                  onViewChange={setCalendarView}
                  refreshTrigger={refreshSchedules}
                />
              )}
            </div>
          </div>
          
          {/* Day Schedule - Shows second on mobile */}
          <div className="lg:col-span-4 order-2 lg:order-2">
            <div className="bg-card rounded-3xl shadow-sm border border-border/60 p-4 sm:p-6 h-full transition-all duration-300 hover:shadow-md">
              <DaySchedule
                date={selectedDate}
                onEditSchedule={handleEditSchedule}
                refreshTrigger={refreshSchedules}
                onNewSchedule={() => {
                  setEditingSchedule(undefined);
                  setShowScheduleForm(true);
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 mt-8 sm:mt-16 bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-muted-foreground text-sm font-medium tracking-wide">
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
