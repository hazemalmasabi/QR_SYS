import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currencyCode: string, currencySymbol: string): string {
  return `${amount.toFixed(2)} ${currencySymbol}`
}

export function formatDate(date: string | Date, timezone: string, locale: string = 'ar'): string {
  const d = new Date(date)
  return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(date: string | Date, timezone: string, locale: string = 'ar'): string {
  const d = new Date(date)
  return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(date: string | Date, timezone: string, locale: string = 'ar'): string {
  return `${formatDate(date, timezone, locale)} ${formatTime(date, timezone, locale)}`
}

export function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[@#$%^&*!]/.test(password)) score++

  const labels = ['', 'weak', 'weak', 'medium', 'strong', 'veryStrong']
  return { score, label: labels[score] || 'weak' }
}

export const TIMEZONES = [
  { value: 'Asia/Riyadh', label: { ar: 'توقيت السعودية', en: 'Saudi Arabia Time' } },
  { value: 'Asia/Dubai', label: { ar: 'توقيت الإمارات', en: 'UAE Time' } },
  { value: 'Asia/Kuwait', label: { ar: 'توقيت الكويت', en: 'Kuwait Time' } },
  { value: 'Asia/Qatar', label: { ar: 'توقيت قطر', en: 'Qatar Time' } },
  { value: 'Asia/Bahrain', label: { ar: 'توقيت البحرين', en: 'Bahrain Time' } },
  { value: 'Africa/Cairo', label: { ar: 'توقيت مصر', en: 'Egypt Time' } },
  { value: 'Europe/Istanbul', label: { ar: 'توقيت تركيا', en: 'Turkey Time' } },
  { value: 'Europe/London', label: { ar: 'توقيت غرينتش', en: 'GMT' } },
  { value: 'America/New_York', label: { ar: 'التوقيت الشرقي', en: 'Eastern Time' } },
]

export const CURRENCIES = [
  { code: 'SAR', symbol: 'ر.س', label: { ar: 'ريال سعودي', en: 'Saudi Riyal' } },
  { code: 'AED', symbol: 'د.إ', label: { ar: 'درهم إماراتي', en: 'UAE Dirham' } },
  { code: 'KWD', symbol: 'د.ك', label: { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' } },
  { code: 'QAR', symbol: 'ر.ق', label: { ar: 'ريال قطري', en: 'Qatari Riyal' } },
  { code: 'BHD', symbol: 'د.ب', label: { ar: 'دينار بحريني', en: 'Bahraini Dinar' } },
  { code: 'EGP', symbol: 'ج.م', label: { ar: 'جنيه مصري', en: 'Egyptian Pound' } },
  { code: 'USD', symbol: '$', label: { ar: 'دولار أمريكي', en: 'US Dollar' } },
  { code: 'EUR', symbol: '€', label: { ar: 'يورو', en: 'Euro' } },
  { code: 'GBP', symbol: '£', label: { ar: 'جنيه إسترليني', en: 'British Pound' } },
]
