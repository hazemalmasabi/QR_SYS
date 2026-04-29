'use client'

import { useState, useEffect, useCallback, useRef, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
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
  Edit,
  Trash2,
} from 'lucide-react'
import { cn, formatCurrency, formatTime } from '@/lib/utils'
import type { Order } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { EditOrderGuestModal } from './EditOrderGuestModal'
import {
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
  main_services?: { service_name: Record<string, string> }
}

const statusConfig = {
  new: {
    badge: 'badge-new',
    icon: Package,
  },
  under_modification: {
    badge: 'badge-under-modification',
    icon: Edit,
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
  const [sessionSummary, setSessionSummary] = useState<{total: number, paid: number, remaining: number} | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithService | null>(null)
  
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  
  const [, setNotifPermission] = useState<NotificationPermission>('default')
  const prevStatusRef = useRef<Record<string, string>>({})

  const fetchOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await fetch(`/api/guest/${qrCode}/orders`)
      const data = await res.json()
      if (data.success) {
        setActiveOrders(data.activeOrders)
        setRecentOrders(data.recentOrders)
        if (data.sessionSummary !== undefined) {
          setSessionSummary(data.sessionSummary)
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [qrCode])

  const handleConfirmCancel = async () => {
    if (!cancelOrderId) return
    setCancelLoading(true)
    try {
      await fetch(`/api/orders/${cancelOrderId}/guest-edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_order', cancel_reason: 'guestCancelled' })
      })
      toast.success(tOrders('cancelledSuccess'))
      fetchOrders()
    } catch (e) {
      console.error(e)
    } finally {
      setCancelLoading(false)
      setCancelOrderId(null)
    }
  }

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
          const statusText = tOrders(
            updated.status === 'in_progress' ? 'inProgress' :
              updated.status === 'completed' ? 'completed' :
                updated.status === 'cancelled' ? 'cancelled' : 
                  updated.status === 'under_modification' ? 'underModification' : 'new'
          )

          const title = t('orderStatus')
          const body = t('orderStatusNotification', {
            number: updated.order_number,
            status: statusText
          })
          showBrowserNotification(title, body)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qrCode, locale, fetchOrders, t, tOrders])

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
      case 'under_modification': return tOrders('underModification')
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

  const tm = useTranslations('ordersDetails')
  const renderReason = (reason: string | null) => {
    if (!reason) return null
    
    // Split by newline to separate key from technical logs
    const lines = reason.split('\n')
    const firstLine = lines[0]
    
    let renderedFirstLine = firstLine
    if (tm.has(`presets.${firstLine}`)) renderedFirstLine = tm(`presets.${firstLine}`)
    else if (tm.has(`modificationPresets.${firstLine}`)) renderedFirstLine = tm(`modificationPresets.${firstLine}`)
    else if (tOrders.has(firstLine)) renderedFirstLine = tOrders(firstLine)
    
    if (lines.length > 1) {
      return (
        <div className="space-y-1">
          <div className="font-bold">{renderedFirstLine}</div>
          <div className="text-xs opacity-90 leading-relaxed whitespace-pre-line">
            {lines.slice(1).join('\n')}
          </div>
        </div>
      )
    }
    
    return renderedFirstLine
  }

  const renderOrderCard = (order: OrderWithService) => {
    const config = statusConfig[order.status] || statusConfig.new
    const StatusIcon = config.icon
    const serviceName = order.main_services?.service_name
      ? (order.main_services.service_name[locale] || order.main_services.service_name.en || order.main_services.service_name.ar || '')
      : ''

    const isNotesExpanded = expandedNotes.has(order.order_id)
    const isReasonExpanded = expandedReasons.has(order.order_id)
    const hasNotes = !!(order.notes && order.notes.trim())
    const hasCancelReason = !!(order.cancellation_reason && order.cancellation_reason.trim())
    const hasModificationReason = !!(order.modification_reason && order.modification_reason.trim())
    const isModificationExpanded = isReasonExpanded

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
              order.status === 'under_modification' && 'text-amber-500',
              order.status === 'in_progress' && 'text-yellow-500',
              order.status === 'completed' && 'text-green-500',
              order.status === 'cancelled' && 'text-red-500',
            )} />
          </div>

          {/* Items — each on its own line */}
          <div className="space-y-1">
            {order.order_items.map((oi, idx) => {
              const name = (oi.item_name as any)[locale] || (oi.item_name as any).en || (oi.item_name as any).ar || ''
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
                {t('notes')}
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
                {t('cancelReason')}
                <ChevronDown className={cn('h-3 w-3 transition-transform', isReasonExpanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}

        {/* Guest Actions (Edit / Cancel) for New AND Under Modification Orders */}
        {(order.status === 'new' || order.status === 'under_modification') && (
           <div className="border-t border-gray-100 flex divide-x divide-gray-100 rtl:divide-x-reverse bg-gray-50/50">
             <button
                onClick={async () => {
                  try {
                    await fetch(`/api/orders/${order.order_id}/guest-edit`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'start_edit' })
                    })
                    setEditingOrder(order)
                    fetchOrders()
                  } catch (e) { console.error(e) }
                }}
                className={'flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors hover:bg-gray-100 text-blue-600'}
             >
                <Edit className="h-4 w-4" />
                {order.status === 'under_modification' ? tOrders('continueEdit') : tOrders('editOrder')}
             </button>
             <button
                onClick={() => setCancelOrderId(order.order_id)}
                className={'flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors hover:bg-red-50 text-red-600'}
             >
                <Trash2 className="h-4 w-4" />
                {tOrders('cancelOrder')}
             </button>
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
            <p className="leading-relaxed italic">{renderReason(order.cancellation_reason)}</p>
          </div>
        )}

        {/* Expandable Modification Reason */}
        {hasModificationReason && isModificationExpanded && (
          <div className="px-4 pb-3 pt-2 bg-amber-50/50 border-t border-amber-100 text-sm text-amber-700">
            <p className="leading-relaxed italic">{renderReason(order.modification_reason)}</p>
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

      {/* Session Summary Sticky Bar */}
      {sessionSummary && hasOrders && (
        <div className="sticky top-4 z-10 mx-[-1rem] px-4 md:mx-0 md:px-0">
          <div className="bg-white shadow-lg shadow-black/5 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
            <div className="flex flex-col">
               <span className="text-xs text-gray-500 font-medium">{t('totalBalance')}</span>
               <span className="font-semibold text-gray-900">{formatCurrency(sessionSummary.total, '', currencySymbol)}</span>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="flex flex-col">
               <span className="text-xs text-gray-500 font-medium">{t('paidBalance')}</span>
               <span className="font-semibold text-green-600">{formatCurrency(sessionSummary.paid, '', currencySymbol)}</span>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="flex flex-col">
               <span className="text-xs text-gray-500 font-medium">{t('remainingBalance')}</span>
               <span className="font-bold text-red-600">{formatCurrency(sessionSummary.remaining, '', currencySymbol)}</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit Order Modal */}
      <EditOrderGuestModal
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSuccess={() => fetchOrders()}
        currencySymbol={currencySymbol}
      />
      {/* Cancel Confirmation Modal */}
      {cancelOrderId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative flex w-full max-sm flex-col rounded-xl bg-white shadow-xl overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{tOrders('cancelOrder')}</h3>
              <p className="text-sm text-gray-500">
                {tOrders('emptyOrderWarning') || 'Are you sure you want to cancel this order?'}
              </p>
            </div>
            <div className="border-t border-gray-100 flex gap-0 bg-white">
              <button
                onClick={() => setCancelOrderId(null)}
                disabled={cancelLoading}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {tOrders('cancelEdit') || 'Back'}
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="flex-1 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex justify-center items-center"
              >
                {cancelLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : tOrders('cancelOrder') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
