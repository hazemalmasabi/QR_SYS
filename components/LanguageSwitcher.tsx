'use client'

import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LanguageSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const locale = useLocale()

  const toggleLocale = async () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    await fetch('/api/set-locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })
    window.location.reload()
  }

  return (
    <button
      onClick={toggleLocale}
      title={locale === 'ar' ? 'English' : 'العربية'}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all duration-200 hover:bg-gray-100 hover:shadow-sm',
        compact && 'px-2 justify-center',
        className
      )}
    >
      <Globe className="h-4 w-4 shrink-0" />
      {!compact && <span>{locale === 'ar' ? 'English' : 'العربية'}</span>}
    </button>
  )
}
