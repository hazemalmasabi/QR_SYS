'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PlusCircle,
  Loader2,
  Package,
  User,
  X,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface OrderDetail {
  order_id: string
  order_number: string
  room_id: string
  hotel_id: string
  service_id: string
  sub_service_id: string | null
  order_items: {
    item_id: string
    item_name: { ar: string; en: string }
    quantity: number
    unit_price: number
    total: number
  }[]
  total_amount: number
  currency_code: string
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  updated_at: string
  cancellation_reason: string | null
  estimated_time: number | null
  actual_time: number | null
  handled_by: string | null
  notes: string | null
  rooms: { room_number: string }
  main_services: { service_name: { ar: string; en: string } }
  employees?: { full_name: string } | null
}

const BADGE_CLASS: Record<string, string> = {
  new: 'badge-new',
  in_progress: 'badge-progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

const STATUS_LABEL_KEY: Record<string, string> = {
  new: 'new',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
}

export default function OrderDetailPage() {
  const t = useTranslations('orders')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const CANCEL_PRESETS = locale === 'ar'
    ? [
      'الضيف غيّر رأيه وقرر إلغاء الطلب',
      'العنصر المطلوب غير متوفر حالياً',
      'طال وقت الانتظار واعتذر الضيف',
      'تم الطلب بالخطأ',
      'الضيف غادر الغرفة',
    ]
    : [
      'Guest changed their mind and cancelled',
      'Requested item is currently unavailable',
      'Guest cancelled due to long wait time',
      'Order placed by mistake',
      'Guest has left the room',
    ]

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setOrder(data.order)
      }
    } catch {
      console.error('Failed to fetch order')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handleStatusUpdate = async (
    newStatus: string,
    reason?: string
  ) => {
    setActionLoading(true)
    try {
      const body: Record<string, string> = { status: newStatus }
      if (reason) {
        body.cancellation_reason = reason
      }

      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (data.success) {
        setOrder(data.order)
        setShowCancelModal(false)
        setCancelReason('')
        setCancelError('')
      }
    } catch {
      console.error('Failed to update order')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAccept = () => handleStatusUpdate('in_progress')
  const handleComplete = () => handleStatusUpdate('completed')

  const handleCancelSubmit = () => {
    const finalReason = selectedPreset === 'other' ? cancelReason : (selectedPreset || cancelReason)
    if (!finalReason.trim()) {
      setCancelError(locale === 'ar' ? 'يرجى اختيار سبب الإلغاء' : 'Please select a cancellation reason')
      return
    }
    handleStatusUpdate('cancelled', finalReason)
  }

  const resetCancelModal = () => {
    setShowCancelModal(false)
    setCancelReason('')
    setCancelError('')
    setSelectedPreset(null)
  }

  const getServiceName = (service: { service_name: { ar: string; en: string } }) => {
    return locale === 'ar' ? service.service_name.ar : service.service_name.en
  }

  const getItemName = (name: { ar: string; en: string }) => {
    return locale === 'ar' ? name.ar : name.en
  }

  const formatDT = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-500">
        <Package className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium">{t('orderNotFound')}</p>
        <button
          onClick={() => router.push('/dashboard/orders')}
          className="btn-primary mt-4"
        >
          {tc('back')}
        </button>
      </div>
    )
  }

  const timelineEvents = [
    {
      key: 'created',
      label: t('orderCreated'),
      time: order.created_at,
      icon: PlusCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      show: true,
    },
    {
      key: 'accepted',
      label: t('orderAccepted'),
      time: order.accepted_at,
      icon: PlayCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      show: !!order.accepted_at,
    },
    {
      key: 'completed',
      label: t('orderCompleted'),
      time: order.completed_at,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      show: !!order.completed_at,
    },
    {
      key: 'cancelled',
      label: t('orderCancelled'),
      time: order.cancelled_at,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      show: !!order.cancelled_at,
    },
  ].filter((e) => e.show)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/orders')}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('orderNumber')} #{order.order_number}
          </h1>
          <span className={BADGE_CLASS[order.status]}>
            {t(STATUS_LABEL_KEY[order.status])}
          </span>
        </div>

      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Order Info + Items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Info Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t('orderDetails')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">{t('room')}</p>
                <p className="font-medium text-gray-900">
                  {order.rooms.room_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('service')}</p>
                <p className="font-medium text-gray-900">
                  {getServiceName(order.main_services)}
                </p>
              </div>

              {order.accepted_at && (
                <div>
                  <p className="text-sm text-gray-500">{t('acceptanceTime')}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">
                      {Math.max(0, Math.round((new Date(order.accepted_at).getTime() - new Date(order.created_at).getTime()) / 60000))} {t('minutes')}
                    </p>
                  </div>
                </div>
              )}
              {order.accepted_at && (order.status === 'completed' || order.status === 'cancelled') && (
                <div>
                  <p className="text-sm text-gray-500">{t('executionTime')}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">
                      {order.actual_time !== null
                        ? order.actual_time
                        : Math.max(0, Math.round(((order.status === 'completed' ? new Date(order.completed_at!) : new Date(order.cancelled_at!)).getTime() - new Date(order.accepted_at).getTime()) / 60000))} {t('minutes')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="card p-0">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('items')}
              </h2>
            </div>
            <div className="table-container border-0 shadow-none">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('itemName')}</th>
                    <th>{t('quantity')}</th>
                    <th>{t('unitPrice')}</th>
                    <th>{t('subtotal')}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-gray-900">
                        {getItemName(item.item_name)}
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price, '', order.currency_code)}</td>
                      <td className="font-medium">
                        {formatCurrency(item.total, '', order.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colSpan={3}
                      className="text-end font-semibold text-gray-900"
                    >
                      {t('total')}
                    </td>
                    <td className="font-bold text-primary-600">
                      {formatCurrency(order.total_amount, '', order.currency_code)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                {t('notes')}
              </h2>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}

          {/* Cancellation Reason */}
          {order.cancellation_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <h2 className="mb-2 text-lg font-semibold text-red-800">
                {t('cancelReason')}
              </h2>
              <p className="text-red-700">{order.cancellation_reason}</p>
            </div>
          )}
        </div>

        {/* Right Column - Timeline & Actions */}
        <div className="space-y-6">
          {(order.status === 'new' || order.status === 'in_progress') && (
            <div className="flex gap-3">
              {order.status === 'new' && (
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="btn-primary flex-1 py-3 text-base shadow-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <PlayCircle className="h-5 w-5" />
                  )}
                  {t('accept')}
                </button>
              )}
              {order.status === 'in_progress' && (
                <>
                  <button
                    onClick={handleComplete}
                    disabled={actionLoading}
                    className="btn-primary flex-1 py-3 text-base shadow-sm"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                    {t('complete')}
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading}
                    className="btn-danger flex-1 py-3 text-base shadow-sm"
                  >
                    <XCircle className="h-5 w-5" />
                    {t('cancelOrder')}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {t('timeline')}
            </h2>
            <div className="relative space-y-0">
              {timelineEvents.map((event, idx) => {
                const Icon = event.icon
                const isLast = idx === timelineEvents.length - 1
                return (
                  <div key={event.key} className="relative flex gap-3 pb-6">
                    {!isLast && (
                      <div className="absolute start-[18px] top-10 h-[calc(100%-24px)] w-px bg-gray-200" />
                    )}
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        event.bgColor
                      )}
                    >
                      <Icon className={cn('h-5 w-5', event.color)} />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="font-medium text-gray-900">
                        {event.label}
                      </p>
                      {event.time && (
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatDT(event.time)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {t('cancelOrder')}
              </h3>
              <button onClick={resetCancelModal} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preset reasons */}
            <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
              <p className="text-sm font-medium text-gray-600 mb-3">
                {locale === 'ar' ? 'اختر سبب الإلغاء:' : 'Select a cancellation reason:'}
              </p>
              {CANCEL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedPreset(preset)
                    if (cancelError) setCancelError('')
                  }}
                  className={cn(
                    'w-full text-start rounded-xl border px-4 py-3 text-sm transition-all',
                    selectedPreset === preset
                      ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                  )}
                >
                  {preset}
                </button>
              ))}
              {/* Other */}
              <button
                onClick={() => {
                  setSelectedPreset('other')
                  if (cancelError) setCancelError('')
                }}
                className={cn(
                  'w-full text-start rounded-xl border px-4 py-3 text-sm transition-all',
                  selectedPreset === 'other'
                    ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                {locale === 'ar' ? '✏️ أخرى (اكتب السبب)' : '✏️ Other (type reason)'}
              </button>

              {/* Custom reason text area — only when Other selected */}
              {selectedPreset === 'other' && (
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value)
                    if (cancelError) setCancelError('')
                  }}
                  rows={3}
                  autoFocus
                  className={cn('input resize-none mt-2', cancelError && 'input-error')}
                  placeholder={locale === 'ar' ? 'اكتب سبب الإلغاء...' : 'Type cancellation reason...'}
                />
              )}

              {cancelError && (
                <p className="text-sm text-red-500">{cancelError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={resetCancelModal} className="btn-secondary">
                {tc('close')}
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={actionLoading || !selectedPreset}
                className="btn-danger"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {tc('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
