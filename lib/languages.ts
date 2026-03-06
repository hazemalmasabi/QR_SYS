/**
 * Centralized Language Registry
 * Add all supported languages here to automatically reflect across the entire system.
 */

export interface LanguageDef {
    code: string;
    nameEn: string;
    nameNative: string;
    dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageDef[] = [
    { code: 'en', nameEn: 'English', nameNative: 'English', dir: 'ltr' },
    { code: 'ar', nameEn: 'Arabic', nameNative: 'العربية', dir: 'rtl' },
    { code: 'fr', nameEn: 'French', nameNative: 'Français', dir: 'ltr' },
    // To add a new language, simply add it here:
    // { code: 'es', nameEn: 'Spanish', nameNative: 'Español', dir: 'ltr' },
];

export const locales = SUPPORTED_LANGUAGES.map(lang => lang.code) as readonly string[];
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';

export function getLanguageOptions(currentLocale: string) {
    return SUPPORTED_LANGUAGES.map(lang => ({
        value: lang.code,
        // Display native name for the language itself, and English as secondary info (or vice versa based on UI needs)
        label: currentLocale === 'en' ? lang.nameEn : lang.nameNative,
        nameNative: lang.nameNative,
        nameEn: lang.nameEn,
        dir: lang.dir
    }));
}

export function getLanguageDirection(locale: string): 'ltr' | 'rtl' {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === locale);
    return lang ? lang.dir : 'ltr';
}

export function getLanguageName(code: string, displayLocale: string = 'en'): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    if (!lang) return code;
    return displayLocale === 'en' ? lang.nameEn : lang.nameNative;
}
