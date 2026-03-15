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

  const fetchStats = useCallback(async () => {
    if (period === 'custom' && (!customFrom || !customTo)) return
    setLoading(true)
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
      setLoading(false)
    }
  }, [period, customFrom, customTo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // ── Supabase Realtime: Refresh stats if any order changes/added ──
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-stats-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          // Whenever an order is created or updated, refresh the stats
          fetchStats()
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

  const otherCards = stats
    ? [
      {
        label: t('stats.totalOrders'),
        value: stats.totalOrders,
        icon: ClipboardList,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
      {
        label: t('stats.totalRevenue'),
        value: formatCurrency(stats.totalRevenue, '', stats.currencySymbol),
        icon: Banknote,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        label: t('stats.avgAcceptanceTime') || 'متوسط وقت القبول',
        value: stats.avgAcceptanceTime !== null
          ? `${Math.round(stats.avgAcceptanceTime)} ${t('stats.minutes')}`
          : '—',
        icon: Timer,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
      },
      {
        label: t('stats.avgExecutionTime') || 'متوسط وقت التنفيذ',
        value: stats.avgExecutionTime !== null
          ? `${Math.round(stats.avgExecutionTime)} ${t('stats.minutes')}`
          : '—',
        icon: Timer,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
      },
    ]
    : []

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">

        {/* Total Orders (First Card) */}
        {otherCards.length > 0 && (() => {
          const card = otherCards[0]
          const Icon = card.icon
          return (
            <div className="stat-card flex flex-col items-center justify-center text-center p-3 sm:p-4 hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-snug break-words w-full px-1 mb-2 h-10 flex items-center justify-center">
                {card.label}
              </p>
              <div className={cn('rounded-full p-2.5 mb-2', card.bg)}>
                <Icon className={cn('h-5 w-5', card.color)} />
              </div>
              <h3 className="text-[17px] sm:text-lg font-bold text-gray-900 leading-none w-full truncate" title={card.value.toString()}>
                {card.value}
              </h3>
            </div>
          )
        })()}

        {/* Grouped Status Cards (Spans 2 columns) */}
        {stats && (
          <div className="stat-card p-3 sm:p-4 hover:shadow-md transition-shadow col-span-2 flex flex-col justify-center h-full bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 w-full">
              {statusCards.map((card, idx) => {
                const Icon = card.icon
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-gray-50/50 border border-gray-100/50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={cn('rounded-full p-1.5 shrink-0', card.bg)}>
                        <Icon className={cn('h-4 w-4', card.color)} />
                      </div>
                      <p className="text-[10px] sm:text-xs font-semibold text-gray-600 leading-tight">
                        {card.label}
                      </p>
                    </div>
                    <h3 className="text-base font-bold text-gray-900" title={card.value.toString()}>
                      {card.value}
                    </h3>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Regular Metric Cards */}
        {otherCards.slice(1).map((card, idx) => {
          const Icon = card.icon
          return (
            <div key={idx} className="stat-card flex flex-col items-center justify-center text-center p-3 sm:p-4 hover:shadow-md transition-shadow bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-snug break-words w-full px-1 mb-2 h-10 flex items-center justify-center">
                {card.label}
              </p>
              <div className={cn('rounded-full p-2.5 mb-2', card.bg)}>
                <Icon className={cn('h-5 w-5', card.color)} />
              </div>
              <h3 className="text-[17px] sm:text-lg font-bold text-gray-900 leading-none w-full truncate" title={card.value.toString()}>
                {card.value}
              </h3>
            </div>
          )
        })}
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
