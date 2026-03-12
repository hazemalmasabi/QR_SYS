'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'

export default function LanguageSwitcher({
  className,
  compact,
  secondaryLocale = 'ar',
  variant = 'toggle'
}: {
  className?: string;
  compact?: boolean;
  secondaryLocale?: string;
  variant?: 'toggle' | 'dropdown';
}) {
  const t = useTranslations('common')
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const isInDashboard = pathname?.startsWith('/dashboard')

  const allLanguages: Record<string, string> = Object.fromEntries(
    SUPPORTED_LANGUAGES.map(lang => [lang.code, lang.nameNative])
  )

  // If in dashboard, only allow English and the hotel's secondary locale
  // If secondaryLocale is 'none', it defaults to 'ar' for the switcher but might be filtered out later if needed
  const dashboardLocales = ['en', secondaryLocale === 'none' ? 'ar' : secondaryLocale]

  const languages = isInDashboard
    ? Object.fromEntries(Object.entries(allLanguages).filter(([key]) => dashboardLocales.includes(key)))
    : allLanguages

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const setLocale = async (newLocale: string) => {
    if (newLocale === locale) return

    await fetch('/api/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })
    window.location.reload()
  }

  const toggleLocale = () => {
    const next = locale === 'en'
      ? (secondaryLocale === 'none' ? 'ar' : secondaryLocale)
      : 'en'
    setLocale(next)
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn("relative", className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-sm",
            isOpen && "ring-2 ring-primary-500/20 border-primary-200"
          )}
        >
          <Globe className="h-4 w-4 text-primary-600" />
          <span className="whitespace-nowrap">{t('changeLanguage')}</span>
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 end-0 z-[100] w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200 max-h-72 overflow-y-auto custom-scrollbar">
            {Object.entries(languages).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setLocale(key)
                  setIsOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  locale === key
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span>{label}</span>
                {locale === key && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Default toggle behavior
  if (secondaryLocale === 'none' && !isInDashboard) return null

  const secondaryToToggle = locale === 'en'
    ? (secondaryLocale === 'none' ? 'ar' : secondaryLocale)
    : 'en'

  return (
    <button
      type="button"
      onClick={toggleLocale}
      title={locale === 'en' ? (languages[secondaryToToggle] || 'Arabic') : 'English'}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-sm',
        compact && 'px-2 justify-center',
        className
      )}
    >
      <Globe className="h-4 w-4 shrink-0" />
      {!compact && <span className="whitespace-nowrap">{locale === 'en' ? (allLanguages[secondaryToToggle]) : 'English'}</span>}
    </button>
  )
}
