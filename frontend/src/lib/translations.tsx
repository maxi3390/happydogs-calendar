'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Language, LanguageInfo, Translations, TranslationValue } from '@/domain/translations/types';

export type { Language, LanguageInfo } from '@/domain/translations/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  const [language, setLanguageState] = useState<Language>('es');
  const [translations, setTranslations] = useState<Translations>({});
  const [loading, setLoading] = useState(true);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' }
  ]);

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'es')) {
      setLanguageState(saved as Language);
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'es') {
        setLanguageState('es');
      }
    }
  }, []);

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
  }, []);

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
