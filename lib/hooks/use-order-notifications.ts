/**
 * Shared utilities for order notification sound and browser notifications.
 * Uses the Web Audio API to generate sound without any external audio files.
 */

/** Plays a short notification beep using Web Audio API */
export function playNotificationSound(type: 'new_order' | 'status_change' = 'new_order') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.connect(gain)
        gain.connect(ctx.destination)

        if (type === 'new_order') {
            // Two-tone alert for new orders (higher pitch, more urgent)
            osc.frequency.setValueAtTime(880, ctx.currentTime)
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15)
        } else {
            // Single softer tone for status changes
            osc.frequency.setValueAtTime(660, ctx.currentTime)
        }

        gain.gain.setValueAtTime(0.4, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.5)

        // Clean up
        osc.onended = () => ctx.close()
    } catch {
        // Silently fail — some browsers block audio without user interaction
    }
}

/** Request browser notification permission */
export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    const result = await Notification.requestPermission()
    return result === 'granted'
}

/** Show a browser notification (only if permission granted) */
export function showBrowserNotification(title: string, body: string) {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    try {
        const n = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'order-notification', // Replaces previous notification of same tag
        })
        // Auto close after 5 seconds
        setTimeout(() => n.close(), 5000)
    } catch {
        // Silently fail
    }
}

// ─────────────────────────────────────────────
// localStorage helpers for guest order tracking
// ─────────────────────────────────────────────

const STORAGE_KEY = 'my-order-ids'

/** Save order IDs to localStorage (appends to existing) */
export function saveMyOrderIds(orderIds: string[]) {
    try {
        const existing = getMyOrderIds()
        const merged = Array.from(new Set([...existing, ...orderIds]))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
        // silently fail
    }
}

/** Get saved order IDs from localStorage */
export function getMyOrderIds(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        return JSON.parse(raw) as string[]
    } catch {
        return []
    }
}

/** Clear saved order IDs */
export function clearMyOrderIds() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // silently fail
    }
}
