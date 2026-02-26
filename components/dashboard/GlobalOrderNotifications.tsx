'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase/client'
import {
    playNotificationSound,
    showBrowserNotification,
    requestNotificationPermission,
} from '@/lib/hooks/use-order-notifications'

export default function GlobalOrderNotifications({ hotelId }: { hotelId: string }) {
    const locale = useLocale()
    const [newOrderToast, setNewOrderToast] = useState<string | null>(null)
    const knownOrderIdsRef = useRef<Set<string>>(new Set())

    // Ask for notification permission on mount
    useEffect(() => {
        requestNotificationPermission()
    }, [])

    // 1. Listen for new orders via Realtime
    useEffect(() => {
        if (!hotelId) return

        const channel = supabase
            .channel('global-new-orders')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `hotel_id=eq.${hotelId}`,
                },
                (payload) => {
                    const newOrder = payload.new as any
                    if (knownOrderIdsRef.current.has(newOrder.order_id)) return
                    knownOrderIdsRef.current.add(newOrder.order_id)

                    // Sound + notification
                    playNotificationSound('new_order')

                    const title = locale === 'ar' ? '🔔 طلب جديد!' : '🔔 New Order!'
                    const body = locale === 'ar' ? 'يوجد طلب جديد بانتظار المراجعة' : 'A new order is waiting for review'
                    showBrowserNotification(title, body)

                    setNewOrderToast(body)
                    setTimeout(() => setNewOrderToast(null), 5000)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [hotelId, locale])

    // 2. Reminder every 2 minutes for unhandled orders
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch('/api/orders?status=new&limit=1')
                const data = await res.json()
                if (data.success && data.total > 0) {
                    playNotificationSound('new_order')
                    const title = locale === 'ar' ? 'تذكير: طلبات معلقة' : 'Reminder: Pending Orders'
                    const body = locale === 'ar'
                        ? `لديك ${data.total} طلب جديد بانتظار المعالجة!`
                        : `You have ${data.total} new orders waiting to be processed!`

                    showBrowserNotification(title, body)
                    setNewOrderToast(body)
                    setTimeout(() => setNewOrderToast(null), 7000) // Stay a bit longer
                }
            } catch (err) {
                // Silent fail
            }
        }, 2 * 60 * 1000) // 2 minutes

        return () => clearInterval(interval)
    }, [locale])

    if (!newOrderToast) return null

    return (
        <div className="fixed top-4 left-1/2 z-[100] w-[90%] sm:w-auto max-w-md -translate-x-1/2 flex items-center justify-center gap-3 rounded-2xl bg-primary-600 px-5 py-4 text-white shadow-2xl shadow-primary-600/40 animate-in slide-in-from-top-4 duration-300 transition-all">
            <span className="text-xl">🔔</span>
            <span className="font-semibold text-center">{newOrderToast}</span>
        </div>
    )
}
