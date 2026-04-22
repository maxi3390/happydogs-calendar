import { enUS, es } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '@/domain/translations/types';

/**
 * Map the app's active language to the matching date-fns locale object
 * so `format()` calls can emit localized day/month names. Keep this
 * small and synchronous so callers can use it inline without a hook.
 */
export function getDateLocale(language: Language): Locale {
  switch (language) {
    case 'es':
      return es;
    case 'en':
    default:
      return enUS;
  }
}

/**
 * Format a raw ISO date ("YYYY-MM-DD", optionally with a trailing time
 * component) as "dd/mm/yyyy" for user display. Returns an empty string
 * for null / empty input and the original value if it doesn't match the
 * expected shape, so callers can use it defensively.
 */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
