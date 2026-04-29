'use client'
import { supabase } from '@/lib/supabase/client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface Order {
  order_id: string
  order_number: string
  service_id: string
  main_services?: { service_name: Record<string, string> }
  total_amount: number
  paid_amount: number
  payment_status: string
  status: string
  created_at: string
}

interface Payment {
  payment_id: string
  amount: number
  payment_method: string
  payment_type: string
  order_id: string | null
  employees?: { full_name: string } | null
  created_at: string
  notes: string | null
}

interface SessionRecordsModalProps {
  roomId: string | null
  isOpen: boolean
  onClose: () => void
  roomNumber?: string
}

export default function SessionRecordsModal({ roomId, isOpen, onClose, roomNumber }: SessionRecordsModalProps) {
  const t = useTranslations('payments')
  const tc = useTranslations('common')
  const tr = useTranslations('rooms')
  const to = useTranslations('orders')
  const locale = useLocale()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  
  const [serviceFilter, setServiceFilter] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  
  const [settleAmount, setSettleAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isPaying, setIsPaying] = useState(false)
  const [userRole, setUserRole] = useState('')

  const fetchRecords = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/session-records`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.orders || [])
        setPayments(data.payments || [])
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [roomId, tc])

  useEffect(() => {
    if (isOpen && roomId) {
      fetchRecords()

      // Fetch user info
      fetch('/api/auth/me')
        .then(r => r.json())
        .then(d => {
          setUserRole(d.role || '')
          if (d.role !== 'hotel_supervisor' && d.assignedServiceId) {
             setServiceFilter(d.assignedServiceId)
          }
        })

      // Subscribe to real-time changes for orders and payments
      const channel = supabase
        .channel(`room-records-${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `room_id=eq.${roomId}` },
          () => fetchRecords()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payments' }, // Payments don't have room_id, so we listen to all and filter? 
          // Actually, we can just refresh on any payment, or use the session_id filter if possible.
          // For safety, refresh on payments too.
          () => fetchRecords()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      setOrders([])
      setPayments([])
      setServiceFilter('')
      setOrderStatusFilter('')
      setPaymentStatusFilter('')
      setSettleAmount('')
      setUserRole('')
    }
  }, [isOpen, roomId, fetchRecords])

  const servicesMap = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach(o => {
      if (o.main_services && o.service_id) {
        const name = o.main_services.service_name[locale] || o.main_services.service_name['en']
        if (name) map.set(o.service_id, name)
      }
    })
    return Array.from(map.entries())
  }, [orders, locale])

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchService = !serviceFilter || o.service_id === serviceFilter
      const matchOrderStatus = !orderStatusFilter || o.status === orderStatusFilter
      
      const rem = o.total_amount - (o.paid_amount || 0)
      const pStatus = rem <= 0 ? 'paid' : (o.paid_amount > 0 ? 'partial' : 'unpaid')
      const matchPaymentStatus = !paymentStatusFilter || pStatus === paymentStatusFilter

      return matchService && matchOrderStatus && matchPaymentStatus
    })
  }, [orders, serviceFilter, orderStatusFilter, paymentStatusFilter])

  const activeOrders = filteredOrders.filter(o => o.status !== 'cancelled')
  const totalAmount = Number(activeOrders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(2))
  const paidAmount = Number(activeOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0).toFixed(2))
  const remainingBalance = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)))

  // Set default full amount when changes
  useEffect(() => {
    if (remainingBalance > 0) {
      setSettleAmount(remainingBalance.toString())
    } else {
      setSettleAmount('')
    }
  }, [remainingBalance])

  const handleSettle = async () => {
    if (!roomId) return
    const amountNum = Number(settleAmount)
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > remainingBalance) {
      toast.error(t('invalidAmount'))
      return
    }

    setIsPaying(true)
    try {
      const res = await fetch('/api/payments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          amount: amountNum,
          payment_method: paymentMethod,
          service_id: serviceFilter || null // if filtered, specifically pay for this service
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchRecords()
      } else {
        toast.error(data.message ? (t(data.message as any) || data.message) : tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setIsPaying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {tr('sessionRecords')} {roomNumber ? `- ${tr('roomNumber')} ${roomNumber}` : ''}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1" disabled={loading || isPaying}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('amount')}</span>
                  <span className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalAmount, '', 'SAR')}</span>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center">
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">{tr('paidBalance') || t('paidBalance')}</span>
                  <span className="text-xl font-bold text-green-600 mt-1">{formatCurrency(paidAmount, '', 'SAR')}</span>
                </div>
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col items-center">
                  <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">{tr('remainingBalance') || t('remainingBalance')}</span>
                  <span className="text-xl font-bold text-red-600 mt-1">{formatCurrency(remainingBalance, '', 'SAR')}</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{tr('service')}:</span>
                  <select 
                    className="input py-1 px-3 !w-auto min-w-[120px] text-xs disabled:bg-white disabled:opacity-100" 
                    value={serviceFilter} 
                    onChange={e => setServiceFilter(e.target.value)}
                    disabled={userRole !== 'hotel_supervisor'}
                  >
                    <option value="">{tc('all')}</option>
                    {servicesMap.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{tc('status')}:</span>
                  <select 
                    className="input py-1 px-3 !w-auto min-w-[120px] text-xs" 
                    value={orderStatusFilter} 
                    onChange={e => setOrderStatusFilter(e.target.value)}
                  >
                    <option value="">{tc('all')}</option>
                    <option value="new">{to('new')}</option>
                    <option value="in_progress">{to('inProgress')}</option>
                    <option value="completed">{to('completed')}</option>
                    <option value="cancelled">{to('cancelled')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase">{t('payment')}:</span>
                  <select 
                    className="input py-1 px-3 !w-auto min-w-[120px] text-xs" 
                    value={paymentStatusFilter} 
                    onChange={e => setPaymentStatusFilter(e.target.value)}
                  >
                    <option value="">{tc('all')}</option>
                    <option value="unpaid">{t('unpaid')}</option>
                    <option value="partial">{t('partial')}</option>
                    <option value="paid">{t('paid')}</option>
                  </select>
                </div>
              </div>

              {/* Bulk Settle Section */}
              {remainingBalance > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1 w-full relative">
                    <label className="text-xs font-semibold text-blue-800 mb-1 block">{t('settleAmount') || 'المبلغ المراد سداده'}</label>
                    <input 
                      type="text" 
                      className="input w-full border-blue-200" 
                      value={settleAmount}
                      onChange={e => {
                        // Convert Arabic/Persian digits to English digits
                        const v = e.target.value
                          .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                          .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
                        
                        const cleaned = v.replace(/[^0-9.]/g, '')
                        const final = cleaned.indexOf('.') !== cleaned.lastIndexOf('.') 
                          ? cleaned.substring(0, cleaned.lastIndexOf('.')) 
                          : cleaned
                          
                        const num = Number(final)
                        if (num > remainingBalance) {
                           setSettleAmount(remainingBalance.toString())
                        } else {
                           setSettleAmount(final)
                        }
                      }}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-xs font-semibold text-blue-800 mb-1 block">{t('method')}</label>
                    <select className="input w-full border-blue-200" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                      <option value="cash">{t('cash')}</option>
                      <option value="card">{t('card')}</option>
                      <option value="transfer">{t('transfer')}</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleSettle}
                    disabled={isPaying || !settleAmount || Number(settleAmount) > remainingBalance || Number(settleAmount) <= 0}
                    className="btn-primary whitespace-nowrap shrink-0 sm:w-auto w-full"
                  >
                     {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                     {t('confirmPayment')}
                  </button>
                </div>
              )}

              {/* Orders List */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">{tr('orders') || tc('orders')}</h4>
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">{tc('noData')}</p>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="table w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th>{tc('id')}</th>
                          <th>{tr('service')}</th>
                          <th>{t('amount')}</th>
                          <th>{tr('paidBalance')}</th>
                          <th>{tr('remainingBalance')}</th>
                          <th>{tc('status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredOrders.map(order => {
                          const isCancelled = order.status === 'cancelled'
                          const rem = isCancelled ? 0 : order.total_amount - (order.paid_amount || 0)
                          return (
                            <tr key={order.order_id}>
                              <td className="font-mono text-xs">#{order.order_number}</td>
                              <td>{order.main_services?.service_name?.[locale] || order.main_services?.service_name?.['en'] || '-'}</td>
                              <td className="font-medium">{formatCurrency(order.total_amount, '', 'SAR')}</td>
                              <td className="text-green-600">{formatCurrency(order.paid_amount || 0, '', 'SAR')}</td>
                              <td className="text-red-600">{formatCurrency(rem > 0 ? rem : 0, '', 'SAR')}</td>
                              <td>
                                {order.status === 'cancelled' ? (
                                   <span className="text-xs text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">{to('cancelled')}</span>
                                ) : rem <= 0 ? (
                                   <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded font-medium">{t('paid')}</span>
                                ) : order.paid_amount > 0 ? (
                                   <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded font-medium">{t('partial')}</span>
                                ) : (
                                   <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">{t('unpaid')}</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  </div>
                )}
              </div>

              {/* Payments History */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">{t('title')}</h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">{tc('noData')}</p>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="table w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th>{t('date')}</th>
                          <th>{tc('id')}</th>
                          <th>{t('amount')}</th>
                          <th>{t('method')}</th>
                          <th>{t('recipient')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map(payment => {
                          // Try to find the matched order
                          const ord = orders.find(o => o.order_id === payment.order_id)
                          return (
                            <tr key={payment.payment_id}>
                              <td className="whitespace-nowrap">{formatDateTime(payment.created_at, 'Asia/Riyadh', locale)}</td>
                              <td>
                                {ord ? <span className="font-mono text-xs bg-gray-100 px-1 rounded">#{ord.order_number}</span> : '-'}
                              </td>
                              <td className="font-bold text-gray-900">{formatCurrency(payment.amount, '', 'SAR')}</td>
                              <td>{payment.payment_method === 'cash' ? t('cash') : payment.payment_method === 'card' ? t('card') : t('transfer')}</td>
                              <td>{payment.employees?.full_name || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
