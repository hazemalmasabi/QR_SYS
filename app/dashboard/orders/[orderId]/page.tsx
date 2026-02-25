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
import { cn } from '@/lib/utils'

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
    if (!cancelReason.trim()) {
      setCancelError(t('cancelReasonRequired'))
      return
    }
    handleStatusUpdate('cancelled', cancelReason)
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {order.status === 'new' && (
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {t('accept')}
            </button>
          )}
          {order.status === 'in_progress' && (
            <>
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="btn-primary"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t('complete')}
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="btn-danger"
              >
                <XCircle className="h-4 w-4" />
                {t('cancelOrder')}
              </button>
            </>
          )}
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
              {order.handled_by && (
                <div>
                  <p className="text-sm text-gray-500">{t('handledBy')}</p>
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">
                      {order.employees?.full_name || order.handled_by}
                    </p>
                  </div>
                </div>
              )}
              {order.actual_time !== null && (
                <div>
                  <p className="text-sm text-gray-500">{t('actualTime')}</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="font-medium text-gray-900">
                      {order.actual_time} {t('minutes')}
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
                      <td>{item.unit_price.toFixed(2)}</td>
                      <td className="font-medium">
                        {item.total.toFixed(2)}
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
                      {order.total_amount.toFixed(2)} {order.currency_code}
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

        {/* Right Column - Timeline */}
        <div className="space-y-6">
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
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('cancelOrder')}
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancelError('')
                }}
                className="btn-ghost p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className="label">{t('cancelReason')}</label>
              <textarea
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value)
                  if (cancelError) setCancelError('')
                }}
                rows={3}
                className={cn('input resize-none', cancelError && 'input-error')}
                placeholder={t('cancelReasonPlaceholder')}
              />
              {cancelError && (
                <p className="mt-1 text-sm text-red-500">{cancelError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelReason('')
                  setCancelError('')
                }}
                className="btn-secondary"
              >
                {tc('close')}
              </button>
              <button
                onClick={handleCancelSubmit}
                disabled={actionLoading}
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
