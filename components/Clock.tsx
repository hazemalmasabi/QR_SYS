'use client'

import { useEffect, useState } from 'react'
import { Clock as ClockIcon } from 'lucide-react'
import { cn, getAdjustedDate } from '@/lib/utils'

export function Clock({ className, iconClassName, timezone }: { className?: string; iconClassName?: string; timezone?: string }) {
    const [time, setTime] = useState<string>('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        const updateClock = () => {
            const now = new Date()

            if (timezone && timezone.startsWith('GMT')) {
                const adjusted = getAdjustedDate(now, timezone)
                const h = String(adjusted.getHours()).padStart(2, '0')
                const m = String(adjusted.getMinutes()).padStart(2, '0')
                setTime(`${h}:${m}`)
            } else {
                // Use 24-hour format with IANA timezone if provided
                const formatted = now.toLocaleTimeString('en-US', {
                    timeZone: timezone || undefined,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                })
                setTime(formatted)
            }
        }

        updateClock()
        const interval = setInterval(updateClock, 10000) // Update every 10 seconds for better responsiveness in settings

        return () => clearInterval(interval)
    }, [timezone])

    return (
        <div className={cn("flex items-center justify-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm whitespace-nowrap transition-shadow hover:shadow-md", className)}>
            <ClockIcon className={cn("w-4 h-4 text-primary-600", iconClassName)} />
            {mounted ? (
                <span dir="ltr" className="font-bold text-gray-900 tracking-wider font-mono text-sm sm:text-base">{time}</span>
            ) : (
                <div className="w-12 sm:w-16 h-5 animate-pulse rounded bg-gray-100" />
            )}
        </div>
    )
}
