'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language, LanguageInfo, Translations, TranslationValue } from '@/domain/translations/types';
import { useAuth } from '@/lib/auth';
import { usersApi } from '@/domain/users/api';

export type { Language, LanguageInfo } from '@/domain/translations/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
  loading: boolean;
  availableLanguages: LanguageInfo[];
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const STORAGE_KEY = 'preferred_language';

function getNestedValue(obj: Translations, path: string): string {
  const keys = path.split('.');
  let current: TranslationValue = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Return the key if not found
    }
  }

  return typeof current === 'string' ? current : path;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { user, applyUser } = useAuth();
  const [language, setLanguageState] = useState<Language>('es');
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' }
  ]);

  // Resolve the active language from four sources, in order:
  //
  //   1. user.language (the authenticated user's stored preference).
  //   2. localStorage.preferred_language (per-device fallback used on
  //      pre-auth surfaces — login / register / public calendar).
  //   3. navigator.language (browser sniff).
  //   4. 'es' (the product default).
  //
  // The user-bound source takes precedence so a shared kiosk doesn't
  // flip languages between staff who happen to share a browser.
  useEffect(() => {
    if (user?.language === 'en' || user?.language === 'es') {
      setLanguageState(user.language as Language);
      return;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'es')) {
      setLanguageState(saved as Language);
    } else {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'es') {
        setLanguageState('es');
      }
    }
  }, [user?.language]);

  // Fetch translations when language changes
  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/translations/${language}/`);
        if (response.ok) {
          const data = await response.json();
          setTranslations(data);
        } else {
          console.error('Failed to fetch translations');
        }
      } catch (error) {
        console.error('Error fetching translations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [language]);

  // Fetch available languages
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch(`${API_BASE}/languages/`);
        if (response.ok) {
          const data = await response.json();
          setAvailableLanguages(data);
        }
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };

    fetchLanguages();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Persist to the user record when authenticated so the choice
    // sticks across devices. Fire-and-forget — the failure mode is a
    // benign "the language flips back on next login," not data loss.
    if (user) {
      usersApi.setLanguage(lang).then(applyUser).catch(() => {});
    }
  }, [user, applyUser]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(translations, key);
    return interpolate(value, params);
  }, [translations]);

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translations,
        loading,
        availableLanguages
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
