'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Option {
    value: string
    label: string | { ar: string; en: string }
}

interface SearchableSelectProps {
    options: Option[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    noResultsText?: string
    locale?: string
    icon?: React.ReactNode
    hasIcon?: boolean
    className?: string
    error?: boolean
    showOtherOption?: boolean
    otherLabel?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    searchPlaceholder = 'Search...',
    noResultsText = 'No results found',
    locale = 'ar',
    icon,
    hasIcon,
    className,
    error,
    showOtherOption = true,
    otherLabel = 'Other',
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter((opt) => {
        const labelStr = typeof opt.label === 'string' ? opt.label : opt.label[locale as 'ar' | 'en']
        return labelStr.toLowerCase().includes(search.toLowerCase()) || opt.value.toLowerCase().includes(search.toLowerCase())
    })

    // We append it during rendering if requested
    const displayOptions = [...filteredOptions]
    if (showOtherOption) {
        if (!displayOptions.find(o => o.value === 'OTHER')) {
            displayOptions.push({ value: 'OTHER', label: otherLabel })
        }
    }

    const selectedOption = options.find((opt) => opt.value === value) || (value === 'OTHER' ? { value: 'OTHER', label: otherLabel } : null)
    let selectedLabel = placeholder
    if (selectedOption) {
        selectedLabel = typeof selectedOption.label === 'string'
            ? selectedOption.label
            : (selectedOption.label[locale as 'ar' | 'en'] || selectedOption.label.en)
    }

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    'input w-full flex items-center justify-between text-start',
                    error && 'input-error',
                    className
                )}
            >
                <span className={cn('block truncate', hasIcon && 'ps-8', !value && 'text-gray-500')}>
                    {selectedLabel}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    <div className="sticky top-0 bg-white px-2 py-1 z-10 w-full">
                        <div className="relative">
                            <Search className="absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-200 py-1 pe-3 ps-8 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                placeholder={searchPlaceholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    {displayOptions.length === 0 ? (
                        <div className="relative cursor-default select-none px-4 py-1.5 text-gray-500">
                            {noResultsText}
                        </div>
                    ) : (
                        displayOptions.map((opt) => {
                            const labelStr = typeof opt.label === 'string' ? opt.label : opt.label[locale as 'ar' | 'en']
                            const isSelected = value === opt.value
                            return (
                                <div
                                    key={opt.value}
                                    className={cn(
                                        'relative cursor-default select-none flex py-1.5 pe-4 ps-10 hover:bg-gray-100 transition-colors',
                                        isSelected ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                                    )}
                                    onClick={() => {
                                        onChange(opt.value)
                                        setOpen(false)
                                        setSearch('')
                                    }}
                                >
                                    {isSelected && (
                                        <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-primary-600">
                                            <Check className="h-4 w-4" />
                                        </span>
                                    )}
                                    <span className={cn('block whitespace-normal break-words', isSelected ? 'font-medium' : 'font-normal')}>
                                        {labelStr}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
