'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Users, CalendarDays, Settings, Menu, X, LogIn, LogOut, Shield, User, ChevronDown } from 'lucide-react';
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navLinkClass = (path: string, baseColor: string, activeColor: string) => {
    const active = isActive(path);
    if (active) {
      return `flex items-center gap-2 px-3 lg:px-4 py-2 ${activeColor} text-white rounded-xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.2)] text-sm transform transition-all duration-300 hover:-translate-y-0.5`;
    }
    return `flex items-center gap-2 px-3 lg:px-4 py-2 text-foreground/70 hover:text-foreground rounded-xl hover:bg-secondary/50 dark:hover:bg-secondary/40 transition-all duration-300 text-sm hover:-translate-y-0.5`;
  };

  const mobileNavLinkClass = (path: string, activeColor: string) => {
    const active = isActive(path);
    if (active) {
      return `flex items-center gap-3 px-4 py-3 ${activeColor} text-white rounded-xl shadow-md`;
    }
    return `flex items-center gap-3 px-4 py-3 bg-secondary/30 dark:bg-secondary/20 text-foreground/80 rounded-xl transition-colors hover:bg-secondary/50`;
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 w-full ${scrolled ? 'bg-background/80 backdrop-blur-xl shadow-sm border-b border-border' : 'bg-transparent border-transparent pt-2'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group hover:opacity-90 transition-opacity">
            <div className={`p-2 rounded-xl transition-all duration-300 shadow-md flex items-center justify-center ${isActive('/') ? 'bg-primary scale-105' : 'bg-primary/90 group-hover:scale-105 group-hover:bg-primary'}`}>
              <PawPrint className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{t('app.name')}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden sm:block tracking-wide uppercase">{t('app.tagline')}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3 bg-secondary/30 dark:bg-secondary/10 p-1.5 rounded-2xl border border-border/40 backdrop-blur-md">
            <LanguageSwitcher />
            <ThemeToggle />
            <div className="w-px h-6 bg-border/50 mx-1" />
            
            <Link
              href="/owners"
              className={navLinkClass('/owners', 'gray', 'bg-slate-700 dark:bg-slate-600')}
            >
              <Users className="w-4 h-4 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline font-medium">{t('nav.owners')}</span>
            </Link>
            <Link
              href="/pets"
              className={navLinkClass('/pets', 'emerald', 'bg-primary hover:bg-primary/90 dark:bg-primary hover:bg-primary/90')}
            >
              <PawPrint className="w-4 h-4 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline font-medium">{t('nav.pets')}</span>
            </Link>
            {onNewSchedule && (
              <button
                onClick={onNewSchedule}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm font-medium ml-1"
              >
                <CalendarDays className="w-4 h-4 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">{t('nav.newSchedule')}</span>
              </button>
            )}

            {/* Auth/Profile Section */}
            {isAuthenticated ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-2 lg:px-3 py-1.5 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-xl shadow-sm transition-all duration-300"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden lg:inline text-sm font-medium text-foreground pr-1">{user?.first_name}</span>
                  <ChevronDown className={`hidden lg:block w-3 h-3 text-muted-foreground transition-transform duration-300 ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-background border border-border/50 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-border/50 bg-secondary/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                            {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="font-medium text-sm text-foreground truncate">{user?.first_name} {user?.last_name}</span>
                            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link
                          href="/settings"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                        >
                          <Settings className="w-4 h-4 text-amber-500" />
                          {t('nav.settings')}
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin/users"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-secondary/80 rounded-xl transition-colors"
                          >
                            <Shield className="w-4 h-4 text-purple-500" />
                            Admin
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left rounded-xl transition-colors mt-1"
                        >
                          <LogOut className="w-4 h-4" />
                          {t('auth.signOut')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium ml-1"
              >
                <LogIn className="w-4 h-4 lg:w-4 lg:h-4" />
                <span className="hidden lg:inline">{t('auth.signIn')}</span>
              </Link>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2 bg-secondary/50 p-1 rounded-2xl border border-border/50">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-foreground/70 hover:text-foreground hover:bg-background/80 rounded-xl transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/', 'bg-primary')}
              >
                <CalendarDays className="w-5 h-5" />
                {t('nav.calendar')}
              </Link>
              <Link
                href="/owners"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/owners', 'bg-slate-700 dark:bg-slate-600')}
              >
                <Users className="w-5 h-5" />
                {t('nav.owners')}
              </Link>
              <Link
                href="/pets"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass('/pets', 'bg-primary hover:bg-primary/90 dark:bg-primary hover:bg-primary/90')}
              >
                <PawPrint className="w-5 h-5" />
                {t('nav.pets')}
              </Link>

              {onNewSchedule && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNewSchedule();
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground font-medium rounded-xl shadow-md"
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
                  className="flex items-center gap-3 px-4 py-3 bg-purple-600 text-white font-medium rounded-xl shadow-md"
                >
                  <Users className="w-5 h-5" />
                  {t('multiPet.title')}
                </button>
              )}

              {/* Mobile Auth Section */}
              <div className="border-t border-border/50 pt-4 mt-2">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        {isAdmin ? <Shield className="w-5 h-5 text-amber-500" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium flex items-center gap-2">
                          {user?.first_name} {user?.last_name}
                          {isAdmin && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-bold">
                              {t('auth.admin')}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className={mobileNavLinkClass('/settings', 'bg-amber-600 dark:bg-amber-500')}
                    >
                      <Settings className="w-5 h-5" />
                      {t('nav.settings')}
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className={mobileNavLinkClass('/admin', 'bg-purple-600 dark:bg-purple-500')}
                      >
                        <Shield className="w-5 h-5" />
                        Admin
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 px-4 py-3 w-full bg-destructive/10 text-destructive font-medium rounded-xl hover:bg-destructive/20 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      {t('auth.signOut')}
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-md"
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
