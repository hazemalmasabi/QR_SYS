'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Timer,
  Bell,
  Eye,
  Package,
  Loader2,
  Calendar,
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { Clock as ClockComponent } from '@/components/Clock'
import { useHotel } from '@/components/Providers/HotelProvider'

type Period = 'today' | '7d' | '30d' | '90d' | 'custom'

interface RecentOrder {
  order_id: string
  order_number: string
  room_number: string
  service_name: { ar: string; en: string }
  total_amount: number
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

interface DashboardStats {
  totalOrders: number
  newOrders: number
  inProgress: number
  completed: number
  cancelled: number
  totalRevenue: number
  totalPaid: number
  totalRemaining: number
  avgAcceptanceTime: number | null
  avgExecutionTime: number | null
  currencySymbol: string
  timezone: string
  recentOrders: RecentOrder[]
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

export default function DashboardPage() {
  const t = useTranslations('dashboard')
  const to = useTranslations('orders')
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
  const { timezone } = useHotel()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const fetchStats = useCallback(async (silent = false) => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom') {
        params.set('dateFrom', customFrom)
        params.set('dateTo', customTo)
      }
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [period, customFrom, customTo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ── Supabase Realtime: Refresh stats if any order or payment changes ──
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchStats(true) // Silent refresh
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchStats(true) // Silent refresh
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchStats])

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t('filters.today') },
    { key: '7d', label: t('filters.7d') },
    { key: '30d', label: t('filters.30d') },
    { key: '90d', label: t('filters.90d') },
    { key: 'custom', label: t('filters.custom') },
  ]

  // Removed local formatDate function to use global formatDateTime

  const statusCards = stats
    ? [
      {
        label: t('stats.newOrders'),
        value: stats.newOrders,
        icon: Bell,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: t('stats.inProgress'),
        value: stats.inProgress,
        icon: Clock,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
      },
      {
        label: t('stats.completed'),
        value: stats.completed,
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-50',
      },
      {
        label: t('stats.cancelled'),
        value: stats.cancelled,
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
    ] : []



  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Period Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
                period === p.key
                  ? 'bg-white text-primary-700 shadow'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                {t('filters.from')}
              </span>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customFrom}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const val = e.target.value
                    setCustomFrom(val)
                    if (val && customTo && val > customTo) {
                      setCustomTo(val)
                    }
                  }}
                  className="input icon-input input-with-icon ps-10 h-10 text-sm w-[150px]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                {t('filters.to')}
              </span>
              <div className="relative">
                <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="input icon-input input-with-icon ps-10 h-10 text-sm w-[150px]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="ms-auto flex items-center">
          <ClockComponent timezone={timezone} className="px-5 py-2.5 rounded-2xl gap-3 shadow" iconClassName="w-5 h-5" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap xl:flex-nowrap gap-3 sm:gap-4">

        {/* Total Orders */}
        {stats && (
          <div className="stat-card flex-[0.85] min-w-[120px] flex flex-col items-center justify-center text-center p-4 hover:shadow-md transition-all bg-white rounded-2xl border border-gray-100 shadow-sm group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 group-hover:text-primary-600 transition-colors">
              {t('stats.totalOrders')}
            </p>
            <div className="rounded-full p-2.5 mb-3 bg-blue-50 group-hover:scale-110 transition-transform">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 leading-none">
              {stats.totalOrders}
            </h3>
          </div>
        )}

        {/* Status Breakdown */}
        {stats && (
          <div className="stat-card flex-[2.2] min-w-[320px] p-3 sm:p-4 hover:shadow-md transition-all bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col justify-center">
             <div className="grid grid-cols-2 gap-2 sm:gap-3 h-full">
              {statusCards.map((card, idx) => {
                const Icon = card.icon
                return (
                  <div key={idx} className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-gray-50/50 border border-gray-100/50 hover:bg-white hover:border-gray-200 transition-all group/item">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('rounded-full p-1.5 sm:p-2 shrink-0 transition-transform group-hover/item:scale-110', card.bg)}>
                        <Icon className={cn('h-3.5 w-3.5 sm:h-4 w-4', card.color)} />
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-tight truncate">
                        {card.label}
                      </p>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900 ml-2">
                      {card.value}
                    </h3>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Total Revenue */}
        {stats && (
          <div className="stat-card flex-[0.85] min-w-[120px] flex flex-col items-center justify-center text-center p-4 hover:shadow-md transition-all bg-white rounded-2xl border border-gray-100 shadow-sm group">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 group-hover:text-emerald-600 transition-colors">
              {t('stats.totalRevenue')}
            </p>
            <div className="rounded-full p-2.5 mb-3 bg-emerald-50 group-hover:scale-110 transition-transform">
              <Banknote className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-emerald-700 leading-none">
              {formatCurrency(stats.totalRevenue, '', stats.currencySymbol)}
            </h3>
          </div>
        )}

        {/* Paid & Remaining */}
        {stats && (
          <div className="stat-card flex-[1.2] min-w-[180px] p-3 hover:shadow-md transition-all bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 justify-center">
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/40 border border-green-100/50 hover:bg-green-50 transition-colors group">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest mb-1">{t('stats.paid')}</span>
                <span className="text-base sm:text-lg font-black text-green-700">{formatCurrency(stats.totalPaid, '', stats.currencySymbol)}</span>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 opacity-60 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100/50 hover:bg-amber-50 transition-colors group">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">{t('stats.remaining')}</span>
                <span className="text-base sm:text-lg font-black text-amber-700">{formatCurrency(stats.totalRemaining, '', stats.currencySymbol)}</span>
              </div>
              <Clock className="h-5 w-5 text-amber-500 opacity-60 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        )}

        {/* Time Metrics */}
        {stats && (
          <div className="stat-card flex-[1.2] min-w-[180px] p-3 hover:shadow-md transition-all bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 justify-center">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/40 border border-amber-100/50 hover:bg-amber-50 transition-colors group">
              <div className="rounded-full p-2 bg-white shadow-sm group-hover:scale-110 transition-transform">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">{t('stats.avgAcceptanceTime')}</span>
                <span className="text-base sm:text-lg font-black text-gray-900 leading-none">
                  {stats.avgAcceptanceTime !== null ? `${Math.round(stats.avgAcceptanceTime)} ${t('stats.minutes')}` : '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/40 border border-blue-100/50 hover:bg-blue-50 transition-colors group">
              <div className="rounded-full p-2 bg-white shadow-sm group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">{t('stats.avgExecutionTime')}</span>
                <span className="text-lg font-black text-gray-900 leading-none">
                  {stats.avgExecutionTime !== null ? `${Math.round(stats.avgExecutionTime)} ${t('stats.minutes')}` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="card p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('recentOrders')}
          </h2>
          <button
            onClick={() => router.push('/dashboard/orders')}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {t('viewAll')}
          </button>
        </div>

        {!stats?.recentOrders || stats.recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm">{t('noRecentOrders')}</p>
          </div>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: '253px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{to('orderNumber')}</th>
                  <th>{to('room')}</th>
                  <th>{to('service')}</th>
                  <th>{to('total')}</th>
                  <th>{to('status')}</th>
                  <th>{to('date')}</th>
                  <th>{tc('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr
                    key={order.order_id}
                    onClick={() => router.push(`/dashboard/orders/${order.order_id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="font-medium text-gray-900">
                      #{order.order_number}
                    </td>
                    <td>{order.room_number}</td>
                    <td>
                      {locale === 'ar'
                        ? order.service_name.ar
                        : order.service_name.en}
                    </td>
                    <td className="font-medium">
                      {formatCurrency(order.total_amount, '', stats.currencySymbol)}
                    </td>
                    <td>
                      <span className={BADGE_CLASS[order.status]}>
                        {to(STATUS_LABEL_KEY[order.status])}
                      </span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {stats ? formatDateTime(order.created_at, stats.timezone, locale) : '—'}
                    </td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/orders/${order.order_id}`)
                        }}
                        className="btn-ghost p-2 text-gray-500 hover:text-primary-600"
                      >
                        <Eye className="h-5 w-6" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
