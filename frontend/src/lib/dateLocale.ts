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
