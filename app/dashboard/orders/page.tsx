'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Package,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrderRow {
  order_id: string
  order_number: string
  room_id: string
  service_id: string
  order_items: { item_id: string; item_name: { ar: string; en: string }; quantity: number; unit_price: number; total: number }[]
  total_amount: number
  currency_code: string
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  rooms: { room_number: string }
  main_services: { service_name: { ar: string; en: string } }
}

interface ServiceOption {
  service_id: string
  service_name: { ar: string; en: string }
}

const STATUS_TABS = ['all', 'new', 'in_progress', 'completed', 'cancelled'] as const

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

export default function OrdersPage() {
  const t = useTranslations('orders')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  const [orders, setOrders] = useState<OrderRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [services, setServices] = useState<ServiceOption[]>([])
  const [userRole, setUserRole] = useState<string>('')

  const limit = 25
  const totalPages = Math.ceil(total / limit)

  // Fetch services list for filter dropdown (hotel supervisors)
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/orders?page=1&limit=1')
        const data = await res.json()
        if (data.success) {
          // We get role info from a separate lightweight call
        }
      } catch {
        // silently fail
      }
    }

    async function loadServices() {
      try {
        const res = await fetch('/api/services')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.services) {
            setServices(data.services)
          }
        }
      } catch {
        // silently fail - services filter just won't show
      }
    }

    // Determine user role from session cookie parsing on client is not available
    // We infer from the services API - if it returns data, we show filter
    loadServices()
    fetchServices()
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())

      if (activeTab !== 'all') {
        params.set('status', activeTab)
      }
      if (search.trim()) {
        params.set('search', search.trim())
      }
      if (dateFrom) {
        params.set('date_from', dateFrom)
      }
      if (dateTo) {
        params.set('date_to', dateTo)
      }
      if (serviceFilter) {
        params.set('service_id', serviceFilter)
      }

      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setOrders(data.orders)
        setTotal(data.total)
      }
    } catch {
      console.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [page, activeTab, search, dateFrom, dateTo, serviceFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [activeTab, search, dateFrom, dateTo, serviceFilter])

  const getServiceName = (service: { service_name: { ar: string; en: string } }) => {
    return locale === 'ar' ? service.service_name.ar : service.service_name.en
  }

  const getItemsCount = (items: OrderRow['order_items']) => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const formatOrderDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatOrderTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab === 'all' ? tc('all') : t(STATUS_LABEL_KEY[tab])}
          </button>
        ))}
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc('search')}
            className="input max-w-[150px] py-1.5 text-sm"
          />
        </div>

        {/* Date From */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input max-w-[140px] py-1.5 text-sm"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input max-w-[140px] py-1.5 text-sm"
          />
        </div>

        {/* Service Filter (for supervisors) */}
        {services.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="input max-w-[180px] py-1.5 text-sm"
            >
              <option value="">{t('service')} ({tc('all')})</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {getServiceName(s)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Package className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">{t('noOrders')}</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('orderNumber')}</th>
                  <th>{t('room')}</th>
                  <th>{t('service')}</th>
                  <th>{t('items')}</th>
                  <th>{t('total')}</th>
                  <th>{t('status')}</th>
                  <th>{t('dateTime')}</th>
                  <th>{tc('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id}>
                    <td className="font-medium text-gray-900">
                      #{order.order_number}
                    </td>
                    <td>{order.rooms.room_number}</td>
                    <td>{getServiceName(order.main_services)}</td>
                    <td>{getItemsCount(order.order_items)}</td>
                    <td className="font-medium">
                      {order.total_amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={BADGE_CLASS[order.status]}>
                        {t(STATUS_LABEL_KEY[order.status])}
                      </span>
                    </td>
                    <td className="text-gray-500">
                      <div className="text-sm">{formatOrderDate(order.created_at)}</div>
                      <div className="text-xs text-gray-400">{formatOrderTime(order.created_at)}</div>
                    </td>
                    <td>
                      <button
                        onClick={() => router.push(`/dashboard/orders/${order.order_id}`)}
                        className="btn-ghost p-2"
                        title={t('viewOrder')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-600">
                  {t('showing', {
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
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
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
      </div>
    </div>
  )
}
