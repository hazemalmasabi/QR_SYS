'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  CreditCard,
  Plus,
  Loader2,
  FilterX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { SelectRoomModal } from './SelectRoomModal'
import SessionRecordsModal from '@/app/dashboard/rooms/SessionRecordsModal'
import { supabase } from '@/lib/supabase/client'


interface PaymentItem {
  payment_id: string
  amount: number
  payment_method: 'cash' | 'card' | 'transfer'
  payment_type: 'payment' | 'refund' | 'transfer'
  created_at: string
  notes: string | null
  employees?: { full_name: string } | null
  orders?: { order_number: string } | null
  guest_sessions?: { rooms: { room_number: string } } | null
}

export default function PaymentsPage() {
  const t = useTranslations('payments')
  const tc = useTranslations('common')
  const tr = useTranslations('rooms')
  const locale = useLocale()

  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showSelectRoom, setShowSelectRoom] = useState(false)
  const [showSessionRecords, setShowSessionRecords] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [selectedRoomNum, setSelectedRoomNum] = useState<string>('')
  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [services, setServices] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalPaid: 0, totalRemaining: 0 })
  const [userRole, setUserRole] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 25
  const totalPages = Math.ceil(total / limit)

  const fetchPayments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', new Date(startDate).toISOString())
      if (endDate) {
        const eDate = new Date(endDate)
        eDate.setHours(23, 59, 59, 999)
        params.append('endDate', eDate.toISOString())
      }
      if (employeeId) params.append('employeeId', employeeId)
      if (serviceId) params.append('locationId', serviceId)

      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const res = await fetch(`/api/payments?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments || [])
        setTotal(data.total || 0)
        setSummary(data.summary || { totalPaid: 0 })
        if (data.role) {
        setUserRole(data.role)
        if (data.assignedServiceId && !serviceId) {
           setServiceId(data.assignedServiceId)
        }
      }
      } else {
        if (!silent) toast.error(tc('error'))
      }
    } catch {
      if (!silent) toast.error(tc('error'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [startDate, endDate, employeeId, serviceId, page, limit, tc])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Real-time updates for payments and summary cards
  useEffect(() => {
    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchPayments(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchPayments(true)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPayments])

  useEffect(() => {
    // Fetch services for filter
    fetch('/api/services')
      .then(r => r.json())
      .then(d => { if (d.success) setServices(d.services || []) })
  }, [])

  useEffect(() => {
    setPage(1)
  }, [startDate, endDate, employeeId, serviceId])

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setEmployeeId('')
    if (userRole === 'hotel_supervisor') setServiceId('')
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">{t('cash')}</span>
      case 'card':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{t('card')}</span>
      case 'transfer':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">{t('transfer')}</span>
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">{method}</span>
    }
  }

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'payment':
        return <span className="text-green-600 font-medium">{t('payment')}</span>
      case 'refund':
        return <span className="text-red-600 font-medium">{t('refund')}</span>
      case 'transfer':
        return <span className="text-purple-600 font-medium">{t('transferType')}</span>
      default:
        return <span>{type}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setShowSelectRoom(true)}>
          <Plus className="h-5 w-5 rtl:ml-2 ltr:mr-2" />
          {t('settleRoomInvoice')}
        </button>
      </div>

      {/* Filters and Summary Card */}
      <div className="card mb-6 pb-4 overflow-hidden">
        <div className="flex flex-row flex-wrap justify-between items-center gap-6">
          <div className="flex flex-wrap gap-x-4 gap-y-3 items-end flex-1">
            {/* Service Filter */}
            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">{t('service') || tc('service')}</label>
              <select
                className="input w-full sm:w-44 py-1.5 text-sm disabled:bg-gray-50 bg-white"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={userRole !== 'hotel_supervisor'}
              >
                <option value="">{tc('all')}</option>
                {services.map(s => (
                  <option key={s.service_id} value={s.service_id}>
                    {locale === 'ar' ? s.service_name.ar : s.service_name.en}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">{t('startDate')}</label>
              <input
                type="date"
                className="input w-full sm:w-40 py-1.5 text-sm ltr-nums"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-wider">{t('endDate')}</label>
              <input
                type="date"
                className="input w-full sm:w-40 py-1.5 text-sm ltr-nums"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {(startDate || endDate || serviceId || employeeId) && (
              <button
                onClick={clearFilters}
                className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-2 text-red-500 hover:bg-red-50"
              >
                <FilterX className="h-4 w-4" />
                <span>{tc('clearFilters') || tc('all')}</span>
              </button>
            )}
          </div>

          {/* Large Summary Cards */}
          <div className="flex gap-4 shrink-0">
            <div className="w-56 px-6 py-5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-md">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('totalPaid') || 'Total Paid'}</span>
               <span className="text-2xl font-black text-green-600 truncate">{formatCurrency(summary.totalPaid || 0, '', 'SAR')}</span>
            </div>
            
            <div className="w-56 px-6 py-5 rounded-xl bg-gray-50 border border-gray-100 flex flex-col justify-center transition-all hover:bg-white hover:shadow-md">
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{tr('remainingBalance') || 'Total Remaining'}</span>
               <span className="text-2xl font-black text-red-600 truncate">{formatCurrency(summary.totalRemaining || 0, '', 'SAR')}</span>
            </div>
          </div>
        </div>
      </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noPayments')}</h3>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('amount')}</th>
                    <th>{t('type')}</th>
                    <th>{t('method')}</th>
                    <th>{t('recipient')}</th>
                    <th>{t('reference')}</th>
                    <th>{tc('notes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="whitespace-nowrap">
                        {formatDateTime(p.created_at, 'Asia/Riyadh', locale)}
                      </td>
                      <td className="font-bold whitespace-nowrap">
                        {formatCurrency(p.amount, '', 'SAR')}
                      </td>
                      <td>{getPaymentTypeBadge(p.payment_type)}</td>
                      <td>{getPaymentMethodBadge(p.payment_method)}</td>
                      <td className="font-medium whitespace-nowrap">
                        {p.employees?.full_name || '-'}
                      </td>
                      <td>
                        {p.orders?.order_number ? (
                           <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">#{p.orders.order_number}</span>
                        ) : p.guest_sessions?.rooms?.room_number ? (
                           <span className="text-xs bg-gray-100 px-2 py-1 rounded">Room {p.guest_sessions.rooms.room_number}</span>
                        ) : (
                           <span className="text-xs text-gray-400">{t('manual')}</span>
                        )}
                      </td>
                      <td className="text-sm text-gray-600 max-w-xs truncate" title={p.notes || ''}>
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 mt-4">
                <p className="text-sm text-gray-600">
                  {tc('showing', {
                    from: (page - 1) * limit + 1,
                    to: Math.min(page * limit, total),
                    total,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-ghost pagination-prev p-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (page <= 3) pageNum = i + 1
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = page - 2 + i
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                            page === pageNum
                              ? 'bg-primary-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-ghost pagination-next p-2 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <SelectRoomModal 
        isOpen={showSelectRoom} 
        onClose={() => setShowSelectRoom(false)}
        onSelect={(roomId, roomNum) => {
           setSelectedRoomId(roomId)
           setSelectedRoomNum(roomNum)
           setShowSelectRoom(false)
           setShowSessionRecords(true)
        }}
      />
      
      <SessionRecordsModal
        isOpen={showSessionRecords}
        roomId={selectedRoomId}
        roomNumber={selectedRoomNum}
        onClose={() => {
           setShowSessionRecords(false)
           setSelectedRoomId(null)
           fetchPayments()
        }}
      />
    </div>
  )
}
