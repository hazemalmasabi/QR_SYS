import { locales as registryLocales, type Locale as RegistryLocale, defaultLocale as registryDefault } from '@/lib/languages';

export const locales = registryLocales;
export type Locale = RegistryLocale;
export const defaultLocale: Locale = registryDefault;
