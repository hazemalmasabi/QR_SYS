'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import {
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Package,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  Bell,
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import type { Order } from '@/types'
import { supabase } from '@/lib/supabase/client'
import {
  playNotificationSound,
  showBrowserNotification,
  requestNotificationPermission,
  getMyOrderIds,
} from '@/lib/hooks/use-order-notifications'

interface GuestInfo {
  hotel: {
    timezone: string
    currency_code: string
    currency_symbol: string
  }
}

type OrderWithService = Order & {
  main_services?: { service_name: { ar: string; en: string } }
}

const statusConfig = {
  new: {
    badge: 'badge-new',
    icon: Package,
  },
  in_progress: {
    badge: 'badge-progress',
    icon: Clock,
  },
  completed: {
    badge: 'badge-completed',
    icon: CheckCircle2,
  },
  cancelled: {
    badge: 'badge-cancelled',
    icon: XCircle,
  },
}

export default function GuestOrdersPage({
  params,
}: {
  params: Promise<{ qrCode: string }>
}) {
  const { qrCode } = use(params)
  const t = useTranslations('guest')
  const tOrders = useTranslations('orders')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [activeOrders, setActiveOrders] = useState<OrderWithService[]>([])
  const [recentOrders, setRecentOrders] = useState<OrderWithService[]>([])
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const prevStatusRef = useRef<Record<string, string>>({})

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/guest/${qrCode}/orders`)
      const data = await res.json()
      if (data.success) {
        setActiveOrders(data.activeOrders)
        setRecentOrders(data.recentOrders)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [qrCode])

  // Ask for notification permission on mount
  useEffect(() => {
    requestNotificationPermission().then(() => {
      if ('Notification' in window) setNotifPermission(Notification.permission)
    })
  }, [])

  useEffect(() => {
    // Fetch guest info
    fetch(`/api/guest/${qrCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setGuestInfo(data)
      })
      .catch(console.error)

    fetchOrders()
  }, [qrCode, fetchOrders])

  // ── Supabase Realtime: listen only to MY orders (saved in localStorage) ──
  useEffect(() => {
    const myOrderIds = getMyOrderIds()
    if (myOrderIds.length === 0) return

    const channel = supabase
      .channel(`guest-orders-${qrCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const updated = payload.new as Order
          // Only respond to MY orders
          if (!myOrderIds.includes(updated.order_id)) return

          const prevStatus = prevStatusRef.current[updated.order_id]
          if (prevStatus === updated.status) return // no change
          prevStatusRef.current[updated.order_id] = updated.status

          // Refresh orders list
          fetchOrders()

          // Notification
          const statusLabels: Record<string, { ar: string; en: string }> = {
            in_progress: { ar: 'قيد التنفيذ', en: 'In Progress' },
            completed: { ar: 'مكتمل ✅', en: 'Completed ✅' },
            cancelled: { ar: 'ملغى ❌', en: 'Cancelled ❌' },
          }
          const label = statusLabels[updated.status]
          if (label) {
            const title = locale === 'ar' ? 'تحديث طلبك' : 'Order Update'
            const body = locale === 'ar'
              ? `طلبك #${updated.order_number} أصبح: ${label.ar}`
              : `Order #${updated.order_number} is now: ${label.en}`
            showBrowserNotification(title, body)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qrCode, locale, fetchOrders])

  // Keep prevStatusRef up to date when orders load
  useEffect(() => {
    const allOrders = [...activeOrders, ...recentOrders]
    allOrders.forEach((o) => {
      if (!prevStatusRef.current[o.order_id]) {
        prevStatusRef.current[o.order_id] = o.status
      }
    })
  }, [activeOrders, recentOrders])

  // Auto-refresh fallback every 60 seconds (Realtime handles real-time updates)
  useEffect(() => {
    const interval = setInterval(() => fetchOrders(), 30000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const currencySymbol = guestInfo?.hotel.currency_symbol || ''
  const timezone = guestInfo?.hotel.timezone || 'UTC'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return tOrders('new')
      case 'in_progress': return tOrders('inProgress')
      case 'completed': return tOrders('completed')
      case 'cancelled': return tOrders('cancelled')
      default: return status
    }
  }

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set())

  const toggleNotes = (orderId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const toggleReason = (orderId: string) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const renderOrderCard = (order: OrderWithService) => {
    const config = statusConfig[order.status]
    const StatusIcon = config.icon
    const serviceName = order.main_services?.service_name
      ? locale === 'ar' ? order.main_services.service_name.ar : order.main_services.service_name.en
      : ''

    const isNotesExpanded = expandedNotes.has(order.order_id)
    const isReasonExpanded = expandedReasons.has(order.order_id)
    const hasNotes = !!(order.notes && order.notes.trim())
    const hasCancelReason = order.status === 'cancelled' && !!(order.cancellation_reason && order.cancellation_reason.trim())

    return (
      <div key={order.order_id} className="card !p-0 overflow-hidden space-y-0">
        {/* Order Header */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-gray-900">
                  #{order.order_number}
                </span>
                <span className={config.badge}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              {serviceName && (
                <p className="mt-0.5 text-xs text-gray-500">{serviceName}</p>
              )}
            </div>
            <StatusIcon className={cn(
              'h-5 w-5 shrink-0',
              order.status === 'new' && 'text-blue-500',
              order.status === 'in_progress' && 'text-yellow-500',
              order.status === 'completed' && 'text-green-500',
              order.status === 'cancelled' && 'text-red-500',
            )} />
          </div>

          {/* Items — each on its own line */}
          <div className="space-y-1">
            {order.order_items.map((oi, idx) => {
              const name = locale === 'ar' ? oi.item_name.ar : oi.item_name.en
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{name}</span>
                  <span className="font-semibold text-gray-900 tabular-nums bg-gray-100 rounded-full px-2 py-0.5 text-xs">
                    x{oi.quantity}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{formatTime(order.created_at, timezone, locale)}</span>
            </div>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(order.total_amount, '', currencySymbol)}
            </span>
          </div>
        </div>

        {/* Action Buttons — only if notes or cancel reason exist */}
        {(hasNotes || hasCancelReason) && (
          <div className="border-t border-gray-100 flex divide-x divide-gray-100 rtl:divide-x-reverse">
            {hasNotes && (
              <button
                onClick={() => toggleNotes(order.order_id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-gray-50',
                  isNotesExpanded ? 'text-primary-600' : 'text-gray-500'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {locale === 'ar' ? 'الملاحظات' : 'Notes'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', isNotesExpanded && 'rotate-180')} />
              </button>
            )}
            {hasCancelReason && (
              <button
                onClick={() => toggleReason(order.order_id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-gray-50',
                  isReasonExpanded ? 'text-red-600' : 'text-gray-500'
                )}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {locale === 'ar' ? 'سبب الإلغاء' : 'Cancel Reason'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', isReasonExpanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}

        {/* Expandable Notes */}
        {hasNotes && isNotesExpanded && (
          <div className="px-4 pb-3 pt-2 bg-blue-50/50 border-t border-blue-100 text-sm text-gray-700">
            <p className="leading-relaxed">{order.notes}</p>
          </div>
        )}

        {/* Expandable Cancel Reason */}
        {hasCancelReason && isReasonExpanded && (
          <div className="px-4 pb-3 pt-2 bg-red-50/50 border-t border-red-100 text-sm text-red-700">
            <p className="leading-relaxed">{order.cancellation_reason}</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const hasOrders = activeOrders.length > 0 || recentOrders.length > 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/guest/${qrCode}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <BackArrow className="h-5 w-5" />
          </Link>
          <h2 className="text-lg font-bold text-gray-900">{t('myOrders')}</h2>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="btn-ghost !p-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {!hasOrders ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t('noOrders')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('noOrdersDesc')}</p>
          <Link href={`/guest/${qrCode}`} className="btn-primary mt-6">
            {t('browseServices')}
          </Link>
        </div>
      ) : (
        <>
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">{t('activeOrders')}</h3>
              {activeOrders.map(renderOrderCard)}
            </div>
          )}

          {/* Completed/Cancelled Orders */}
          {recentOrders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500">{t('completedOrders')}</h3>
              <div className="space-y-3 opacity-75">
                {recentOrders.map(renderOrderCard)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
