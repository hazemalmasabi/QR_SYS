'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export interface TranslationCounts {
    services: number
    subServices: number
    items: number
    roomTypes: number
}

interface TranslationContextType {
    counts: TranslationCounts
    loading: boolean
    refreshCounts: () => Promise<void>
}

const defaultCounts: TranslationCounts = {
    services: 0,
    subServices: 0,
    items: 0,
    roomTypes: 0,
}

const TranslationContext = createContext<TranslationContextType>({
    counts: defaultCounts,
    loading: true,
    refreshCounts: async () => { },
})

export function TranslationProvider({ children }: { children: ReactNode }) {
    const [counts, setCounts] = useState<TranslationCounts>(defaultCounts)
    const [loading, setLoading] = useState(true)

    const refreshCounts = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/translations/missing-count')
            const data = await res.json()
            if (data.success && data.counts) {
                setCounts(data.counts)
            } else {
                setCounts(defaultCounts)
            }
        } catch (error) {
            console.error('Failed to fetch translation counts:', error)
            setCounts(defaultCounts)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshCounts()
    }, [refreshCounts])

    return (
        <TranslationContext.Provider value={{ counts, loading, refreshCounts }}>
            {children}
        </TranslationContext.Provider>
    )
}

export function useTranslationCounts() {
    const context = useContext(TranslationContext)
    if (!context) {
        throw new Error('useTranslationCounts must be used within TranslationProvider')
    }
    return context
}
