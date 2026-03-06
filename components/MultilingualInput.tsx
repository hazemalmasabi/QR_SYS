'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'

interface MultilingualInputProps {
    label: string
    translations: Record<string, string>
    onChange: (translations: Record<string, string>) => void
    secondaryLocale?: string
    onSecondaryLocaleChange?: (locale: string) => void
    availableLocales: string[]
    errorEn?: string
    errorSecondary?: string
    type?: 'text' | 'textarea'
    placeholderEn?: string
    placeholderSecondary?: string
    maxLength?: number
    dirEn?: 'ltr' | 'rtl'
    dirSecondary?: 'ltr' | 'rtl'
}

export default function MultilingualInput({
    label,
    translations,
    onChange,
    secondaryLocale,
    onSecondaryLocaleChange,
    availableLocales,
    errorEn,
    errorSecondary,
    type = 'text',
    placeholderEn,
    placeholderSecondary,
    maxLength = 500,
    dirEn = 'ltr',
    dirSecondary,
}: MultilingualInputProps) {
    const locale = useLocale()

    const handleEnChange = (val: string) => {
        onChange({ ...translations, en: val })
    }

    const handleSecondaryChange = (val: string) => {
        if (!secondaryLocale) return
        onChange({ ...translations, [secondaryLocale]: val })
    }

    const otherLocales = availableLocales.filter(l => l !== 'en')

    // Default direction for secondary if not provided
    const effectiveDirSecondary = dirSecondary || (secondaryLocale === 'ar' ? 'rtl' : 'ltr')

    const InputComponent = type === 'textarea' ? 'textarea' : 'input'

    const hasSecondaryField = !!secondaryLocale && secondaryLocale !== 'none'

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="label mb-0">{label}</label>
                {otherLocales.length > 1 && onSecondaryLocaleChange && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 p-1">
                        {otherLocales.map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => onSecondaryLocaleChange(l)}
                                className={cn(
                                    "px-2 py-1 text-[10px] font-bold uppercase rounded-md transition-all",
                                    secondaryLocale === l
                                        ? "bg-white text-primary-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className={cn("grid grid-cols-1 gap-4", hasSecondaryField && "sm:grid-cols-2")}>
                {/* English Field */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400">English</span>
                    </div>
                    <InputComponent
                        type={type === 'text' ? 'text' : undefined}
                        value={translations['en'] || ''}
                        onChange={(e: any) => handleEnChange(e.target.value)}
                        className={cn('input', errorEn && 'input-error')}
                        placeholder={placeholderEn || 'English name...'}
                        maxLength={maxLength}
                        dir={dirEn}
                        rows={type === 'textarea' ? 3 : undefined}
                    />
                    {errorEn && <p className="mt-1 text-xs text-red-500">{errorEn}</p>}
                </div>

                {/* Secondary Language Field */}
                {hasSecondaryField && secondaryLocale && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase text-gray-400">
                                {secondaryLocale === 'ar' ? 'العربية' : secondaryLocale === 'fr' ? 'Français' : secondaryLocale.toUpperCase()}
                            </span>
                        </div>
                        <InputComponent
                            type={type === 'text' ? 'text' : undefined}
                            value={translations[secondaryLocale] || ''}
                            onChange={(e: any) => handleSecondaryChange(e.target.value)}
                            className={cn('input', errorSecondary && 'input-error')}
                            placeholder={placeholderSecondary || `${secondaryLocale.toUpperCase()} name...`}
                            maxLength={maxLength}
                            dir={effectiveDirSecondary}
                            rows={type === 'textarea' ? 3 : undefined}
                        />
                        {errorSecondary && <p className="mt-1 text-xs text-red-500">{errorSecondary}</p>}
                    </div>
                )}
            </div>
        </div>
    )
}
