'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Users, CalendarDays, Settings, Menu, X, LogIn, LogOut, Shield } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '@/lib/translations';
import { useAuth } from '@/lib/auth';

interface NavigationProps {
  onNewSchedule?: () => void;
  onMultiPetSchedule?: () => void;
}

export default function Navigation({ onNewSchedule, onMultiPetSchedule }: NavigationProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string, baseColor: string, activeColor: string) => {
    const active = isActive(path);
    if (active) {
      return `flex items-center gap-2 px-3 lg:px-4 py-2 ${activeColor} text-white rounded-lg shadow-sm text-sm ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-${baseColor.split('-')[1]}-400`;
    }
    return `flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm`;
  };

  const mobileNavLinkClass = (path: string, activeColor: string) => {
    const active = isActive(path);
    if (active) {
      return `flex items-center gap-3 px-4 py-3 ${activeColor} text-white rounded-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800`;
    }
    return `flex items-center gap-3 px-4 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg`;
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-indigo-100 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${isActive('/') ? 'bg-indigo-700 dark:bg-indigo-600 ring-2 ring-indigo-400' : 'bg-indigo-600 dark:bg-indigo-500'}`}>
              <PawPrint className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{t('app.name')}</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{t('app.tagline')}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/owners"
              className={navLinkClass('/owners', 'gray', 'bg-gray-600 dark:bg-gray-500')}
            >
              <Users className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden lg:inline">{t('nav.owners')}</span>
            </Link>
            <Link
              href="/pets"
              className={navLinkClass('/pets', 'emerald', 'bg-emerald-600 dark:bg-emerald-500')}
            >
              <PawPrint className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden lg:inline">{t('nav.pets')}</span>
            </Link>
            <Link
              href="/settings"
              className={navLinkClass('/settings', 'amber', 'bg-amber-600 dark:bg-amber-500')}
            >
              <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="hidden lg:inline">{t('nav.settings')}</span>
            </Link>
            {onNewSchedule && (
              <button
                onClick={onNewSchedule}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors shadow-sm text-sm"
              >
                <CalendarDays className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('nav.newSchedule')}</span>
              </button>
            )}

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  {isAdmin && <Shield className="w-4 h-4 text-amber-500" />}
                  <span className="text-sm text-gray-700 dark:text-gray-300">{user?.first_name}</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="hidden lg:inline">{t('auth.signOut')}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm text-sm"
              >
                <LogIn className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="hidden lg:inline">{t('auth.signIn')}</span>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
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
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/', 'bg-indigo-600 dark:bg-indigo-500')}
              >
                <CalendarDays className="w-5 h-5" />
                {t('nav.calendar')}
              </Link>
              <Link
                href="/owners"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/owners', 'bg-gray-600 dark:bg-gray-500')}
              >
                <Users className="w-5 h-5" />
                {t('nav.owners')}
              </Link>
              <Link
                href="/pets"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/pets', 'bg-emerald-600 dark:bg-emerald-500')}
              >
                <PawPrint className="w-5 h-5" />
                {t('nav.pets')}
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/settings', 'bg-amber-600 dark:bg-amber-500')}
              >
                <Settings className="w-5 h-5" />
                {t('nav.settings')}
              </Link>
              {onNewSchedule && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNewSchedule();
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg"
                >
                  <CalendarDays className="w-5 h-5" />
                  {t('nav.newSchedule')}
                </button>
              )}
              {onMultiPetSchedule && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onMultiPetSchedule();
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg"
                >
                  <Users className="w-5 h-5" />
                  {t('multiPet.title')}
                </button>
              )}

              {/* Mobile Auth Section */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-3 mt-2">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                      {isAdmin && <Shield className="w-5 h-5 text-amber-500" />}
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('auth.welcome')}, {user?.first_name}
                      </span>
                      {isAdmin && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                          {t('auth.admin')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      {t('auth.signOut')}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg"
                  >
                    <LogIn className="w-5 h-5" />
                    {t('auth.signIn')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
