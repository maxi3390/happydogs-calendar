export type Language = 'en' | 'es';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

export type TranslationValue = string | { [key: string]: TranslationValue };

export interface Translations {
  [key: string]: TranslationValue;
}
