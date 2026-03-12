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
    { code: 'es', nameEn: 'Spanish', nameNative: 'Español', dir: 'ltr' },
    { code: 'zh', nameEn: 'Mandarin Chinese', nameNative: '中文', dir: 'ltr' },
    { code: 'hi', nameEn: 'Hindi', nameNative: 'हिन्दी', dir: 'ltr' },
    { code: 'bn', nameEn: 'Bengali', nameNative: 'বাংলা', dir: 'ltr' },
    { code: 'pt', nameEn: 'Portuguese', nameNative: 'Português', dir: 'ltr' },
    { code: 'ru', nameEn: 'Russian', nameNative: 'Русский', dir: 'ltr' },
    { code: 'ur', nameEn: 'Urdu', nameNative: 'اردو', dir: 'rtl' },
    { code: 'id', nameEn: 'Indonesian', nameNative: 'Bahasa Indonesia', dir: 'ltr' },
    { code: 'de', nameEn: 'German', nameNative: 'Deutsch', dir: 'ltr' },
    { code: 'ja', nameEn: 'Japanese', nameNative: '日本語', dir: 'ltr' },
    { code: 'pcm', nameEn: 'Nigerian Pidgin', nameNative: 'Naijá', dir: 'ltr' },
    { code: 'mr', nameEn: 'Marathi', nameNative: 'मراठी', dir: 'ltr' },
    { code: 'te', nameEn: 'Telugu', nameNative: 'తెలుగు', dir: 'ltr' },
    { code: 'tr', nameEn: 'Turkish', nameNative: 'Türkçe', dir: 'ltr' },
    { code: 'ta', nameEn: 'Tamil', nameNative: 'தமிழ்', dir: 'ltr' },
    { code: 'yue', nameEn: 'Cantonese', nameNative: '粵語', dir: 'ltr' },
    { code: 'vi', nameEn: 'Vietnamese', nameNative: 'Tiếng Việt', dir: 'ltr' },
    { code: 'tl', nameEn: 'Tagalog', nameNative: 'Wikang Tagalog', dir: 'ltr' },
    { code: 'wuu', nameEn: 'Wu Chinese', nameNative: '吴语', dir: 'ltr' },
    { code: 'ko', nameEn: 'Korean', nameNative: '한국어', dir: 'ltr' },
    { code: 'fa', nameEn: 'Persian', nameNative: 'فارسی', dir: 'rtl' },
    { code: 'ha', nameEn: 'Hausa', nameNative: 'Harshen Hausa', dir: 'ltr' },
    { code: 'sw', nameEn: 'Swahili', nameNative: 'Kiswahili', dir: 'ltr' },
    { code: 'jv', nameEn: 'Javanese', nameNative: 'Basa Jawa', dir: 'ltr' },
    { code: 'it', nameEn: 'Italian', nameNative: 'Italiano', dir: 'ltr' },
    { code: 'pnb', nameEn: 'Western Punjabi', nameNative: 'پنجابی', dir: 'rtl' },
    { code: 'kn', nameEn: 'Kannada', nameNative: 'ಕನ್ನಡ', dir: 'ltr' },
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
