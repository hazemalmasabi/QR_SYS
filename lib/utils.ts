import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parsing GMT offsets like "GMT+03:00" or "GMT-05:30"
 */
function getOffsetMinutes(offsetStr: string): number {
  if (!offsetStr || offsetStr === 'GMT' || offsetStr === 'UTC') return 0
  const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!match) return 0
  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10) || 0
  const mins = parseInt(match[3], 10) || 0
  return sign * (hours * 60 + mins)
}

/**
 * Returns a Date object adjusted to the target timezone/offset
 */
export function getAdjustedDate(date: string | Date, timezone: string): Date {
  const d = new Date(date)
  if (!timezone) return d

  // If it's a GMT offset
  if (timezone.startsWith('GMT')) {
    const offsetMinutes = getOffsetMinutes(timezone)
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
    return new Date(utc + (offsetMinutes * 60000))
  }

  // If it's an IANA name, we can't easily "get a Date object" for that zone in JS 
  // that behaves like local time, but we can use string formatting.
  return d
}

/**
 * Returns true if the current hotel-local time is within [startTime, endTime].
 * startTime / endTime are "HH:MM" strings (24-hour).
 * Pass timezone = hotel timezone (e.g. 'Asia/Riyadh' or 'GMT+03:00').
 */
export function isWithinServiceHours(
  startTime: string,
  endTime: string,
  timezone: string = 'Asia/Riyadh'
): boolean {
  try {
    const now = new Date()
    let timeStr = ''

    if (timezone && timezone.startsWith('GMT')) {
      const adjusted = getAdjustedDate(now, timezone)
      const h = String(adjusted.getHours()).padStart(2, '0')
      const m = String(adjusted.getMinutes()).padStart(2, '0')
      timeStr = `${h}:${m}`
    } else {
      timeStr = now.toLocaleTimeString('en-US', {
        timeZone: timezone || 'Asia/Riyadh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    }
    // Convert to minutes
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const current = toMinutes(timeStr)
    const start = toMinutes(startTime)
    const end = toMinutes(endTime)
    // Handle overnight ranges (e.g. 22:00 - 02:00)
    if (start <= end) return current >= start && current <= end
    return current >= start || current <= end
  } catch {
    return true // fail open
  }
}

export function formatCurrency(amount: number, currencyCode: string, currencySymbol: string): string {
  if (currencyCode === 'OTHER' || !currencySymbol) return amount.toFixed(2)
  // Use Unicode LRE (\u202A) and PDF (\u202C) to force LTR direction for the currency string
  // This ensures the number is on the left and symbol is on the right even in RTL (Arabic)
  return `\u202A${amount.toFixed(2)} ${currencySymbol}\u202C`
}

export function formatDate(date: string | Date, timezone: string, locale: string = 'ar'): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  if (timezone && !timezone.startsWith('GMT')) {
    options.timeZone = timezone
  }

  // If GMT, we use the adjusted date but format it in the local (browser) zone 
  // because we've already "shifted" the hours to match.
  const targetDate = (timezone && timezone.startsWith('GMT')) ? getAdjustedDate(d, timezone) : d

  return targetDate.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', options)
}

export function formatTime(date: string | Date, timezone: string, locale: string = 'ar'): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  }

  if (timezone && !timezone.startsWith('GMT')) {
    options.timeZone = timezone
  }

  const targetDate = (timezone && timezone.startsWith('GMT')) ? getAdjustedDate(d, timezone) : d

  return targetDate.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', options)
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

export const TIMEZONES = Intl.supportedValuesOf('timeZone').map(tz => {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
  const parts = formatter.formatToParts(new Date())
  const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00'

  // Extract region and city. E.g. "Asia/Riyadh" -> region: "Asia", city: "Riyadh"
  const [region, cityRaw] = tz.split('/')
  const cityNameEn = (cityRaw || region).replace(/_/g, ' ')

  let cityNameAr = cityNameEn
  try {
    // We try to translate the region first (e.g., if tz is just a country code which is rare, or we can try formatting)
    // Unfortunately JS Intl doesn't natively translate timezone *cities* well, but we can provide the English name cleanly.
    // However, if there's a known country code mapping we could use it. For now, we translate what Intl provides natively.
    // Some browsers support translating timezone IDs using timezoneName: 'long' in ar
    const arFormatter = new Intl.DateTimeFormat('ar-SA', { timeZone: tz, timeZoneName: 'long' })
    const arParts = arFormatter.formatToParts(new Date())
    const arTzName = arParts.find(p => p.type === 'timeZoneName')?.value
    if (arTzName && arTzName !== 'غرينتش') {
      cityNameAr = arTzName
    }
  } catch {
    // fallback to English city name
  }

  // Fallback for generic GMT if long name fails to give a specific region
  if (cityNameAr.includes('توقيت')) {
    cityNameAr = `${cityNameAr} (${cityNameEn})`
  } else if (cityNameAr === cityNameEn) {
    // If it didn't translate
    cityNameAr = cityNameEn
  }

  return {
    value: tz,
    label: {
      ar: `(${offsetPart}) ${cityNameAr}`,
      en: `(${offsetPart}) ${cityNameEn}`
    },
    offset: offsetPart
  }
}).sort((a, b) => {
  if (a.offset === b.offset) return a.value.localeCompare(b.value)
  return a.offset.localeCompare(b.offset)
})

export const CURRENCIES = Intl.supportedValuesOf('currency').map(code => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 })
  const parts = formatter.formatToParts(0)
  const symbol = parts.find(p => p.type === 'currency')?.value || code

  let arName = code
  let enName = code
  try {
    arName = new Intl.DisplayNames(['ar'], { type: 'currency' }).of(code) || code
    enName = new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || code
  } catch {
    // fallback to code if DisplayNames fails or isn't supported for this currency
  }

  return {
    code,
    symbol,
    label: { ar: `${arName} (${code})`, en: `${enName} (${code})` }
  }
}).sort((a, b) => a.label.ar.localeCompare(b.label.ar))
