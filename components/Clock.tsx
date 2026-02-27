'use client'

import { useEffect, useState } from 'react'
import { Clock as ClockIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Clock({ className, iconClassName }: { className?: string; iconClassName?: string }) {
    const [time, setTime] = useState<string>('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        const updateClock = () => {
            const now = new Date()
            // Use 24-hour format
            const formatted = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
            setTime(formatted)
        }

        updateClock()
        const interval = setInterval(updateClock, 60000) // Update every minute

        return () => clearInterval(interval)
    }, [])

    if (!mounted) {
        // Return empty space or a skeleton to prevent hydration mismatch
        return <div className="w-16 h-5" />
    }

    return (
        <div className={cn("flex items-center justify-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm whitespace-nowrap transition-shadow hover:shadow-md", className)}>
            <ClockIcon className={cn("w-4 h-4 text-primary-600", iconClassName)} />
            <span dir="ltr" className="font-bold text-gray-900 tracking-wider font-mono text-sm sm:text-base">{time}</span>
        </div>
    )
}
