'use client'

import { createContext, useContext, ReactNode } from 'react'

interface HotelData {
    hotel_name: string
    hotel_name_translations: Record<string, string>
    hotel_logo_url: string
    language_secondary: string
}

const HotelContext = createContext<HotelData | null>(null)

export function HotelProvider({ children, hotel }: { children: ReactNode, hotel: HotelData }) {
    return <HotelContext.Provider value={hotel}>{children}</HotelContext.Provider>
}

export function useHotel() {
    const context = useContext(HotelContext)
    if (!context) throw new Error('useHotel must be used within HotelProvider')
    return context
}
