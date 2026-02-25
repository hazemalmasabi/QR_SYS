'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Calendar,
  Filter,
  Loader2,
  ClipboardList,
  Banknote,
  TrendingUp,
  Target,
  ReceiptText,
  CheckCircle2,
  XCircle,
  Timer,
  Medal,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'

type ReportTab = 'orders' | 'revenue'
type QuickPeriod = '7d' | '30d' | '90d' | 'custom'

interface ServiceOption {
  service_id: string
  service_name: { ar: string; en: string }
}

interface OrdersSummary {
  totalOrders: number
  completed: number
  cancelled: number
  inProgress: number
  newOrders: number
  completionRate: number
  avgCompletionTime: number | null
}

interface DailyOrderData {
  date: string
  total: number
  completed: number
  cancelled: number
  newOrders: number
  inProgress: number
}

interface PeakHourData {
  hour: string
  count: number
}

interface CancellationByService {
  serviceName: { ar: string; en: string }
  total: number
  cancelled: number
  rate: number
}

interface RevenueSummary {
  totalRevenue: number
  avgOrderValue: number
  totalOrders: number
}

interface DailyRevenueData {
  date: string
  revenue: number
  orders: number
}

interface TopServiceRevenue {
  serviceName: { ar: string; en: string }
  revenue: number
  orderCount: number
}

interface TopRoom {
  roomNumber: string
  revenue: number
  orderCount: number
}

interface ServiceData {
  serviceId: string
  serviceName: { ar: string; en: string }
  orderCount: number
  completed: number
  cancelled: number
  completionRate: number
  revenue: number
  avgTime: number | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface OrderRow {
  order_id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  rooms: any
  main_services: any
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const STATUS_BADGE: Record<string, string> = {
  new: 'badge-new',
  in_progress: 'badge-progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

const STATUS_KEY: Record<string, string> = {
  new: 'new',
  in_progress: 'inProgress',
  completed: 'completed',
  cancelled: 'cancelled',
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6']

function getDateRange(period: QuickPeriod): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  const from = new Date(today)
  if (period === '7d') from.setDate(today.getDate() - 7)
  else if (period === '30d') from.setDate(today.getDate() - 30)
  else if (period === '90d') from.setDate(today.getDate() - 90)
  return { from: from.toISOString().split('T')[0], to }
}

export default function ReportsPage() {
  const t = useTranslations('reports')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [activeTab, setActiveTab] = useState<ReportTab>('orders')
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('30d')

  const initialRange = getDateRange('30d')
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [serviceFilter, setServiceFilter] = useState('')

  // Orders
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null)
  const [dailyOrderData, setDailyOrderData] = useState<DailyOrderData[]>([])
  const [peakHoursData, setPeakHoursData] = useState<PeakHourData[]>([])
  const [cancellationByService, setCancellationByService] = useState<CancellationByService[]>([])
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])

  // Revenue
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null)
  const [dailyRevenueData, setDailyRevenueData] = useState<DailyRevenueData[]>([])
  const [topServices, setTopServices] = useState<TopServiceRevenue[]>([])
  const [topRooms, setTopRooms] = useState<TopRoom[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('$')


  useEffect(() => {
    async function loadServices() {
      try {
        const res = await fetch('/api/services')
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.services) setServices(data.services)
        }
      } catch { /* silently fail */ }
    }
    loadServices()
  }, [])

  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeTab, dateFrom, dateTo })
      if (serviceFilter) params.set('serviceId', serviceFilter)

      const res = await fetch(`/api/reports?${params.toString()}`)
      const data = await res.json()

      if (!data.success) return

      if (data.currencySymbol) setCurrencySymbol(data.currencySymbol)

      switch (data.type) {
        case 'orders':
          setOrdersSummary(data.summary)
          setDailyOrderData(data.dailyData || [])
          setPeakHoursData(data.peakHoursData || [])
          setCancellationByService(data.cancellationByService || [])
          setOrderRows(data.orders || [])
          break
        case 'revenue':
          setRevenueSummary(data.summary)
          setDailyRevenueData(data.dailyData || [])
          setTopServices(data.topServices || [])
          setTopRooms(data.topRooms || [])
          break

      }
    } catch {
      console.error('Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }, [activeTab, dateFrom, dateTo, serviceFilter])

  useEffect(() => { fetchReport() }, [fetchReport])

  const applyQuickPeriod = (period: QuickPeriod) => {
    setQuickPeriod(period)
    if (period !== 'custom') {
      const range = getDateRange(period)
      setDateFrom(range.from)
      setDateTo(range.to)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getServiceName = (svc: { service_name: { ar: string; en: string } }) =>
    isRTL ? svc.service_name.ar : svc.service_name.en


  const tabs: { key: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'orders', label: t('ordersReport'), icon: ClipboardList },
    { key: 'revenue', label: t('revenueReport'), icon: Banknote },
  ]

  const quickPeriods = [
    { key: '7d' as QuickPeriod, label: isRTL ? '7 أيام' : '7 Days' },
    { key: '30d' as QuickPeriod, label: isRTL ? '30 يوم' : '30 Days' },
    { key: '90d' as QuickPeriod, label: isRTL ? '90 يوم' : '90 Days' },
    { key: 'custom' as QuickPeriod, label: isRTL ? 'مخصص' : 'Custom' },
  ]

  return (
    <div className="space-y-5">
      {/* Header + Tabs row */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-white text-primary-700 shadow'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick period buttons */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {quickPeriods.map((p) => (
            <button
              key={p.key}
              onClick={() => applyQuickPeriod(p.key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                quickPeriod === p.key
                  ? 'bg-white text-primary-700 shadow'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {quickPeriod === 'custom' && (
          <>
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input icon-input input-with-icon ps-10 h-10 text-sm"
              />
            </div>
            <span className="text-gray-400 text-sm">—</span>
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input icon-input input-with-icon ps-10 h-10 text-sm"
              />
            </div>
          </>
        )}

        {services.length > 0 && (
          <div className="relative">
            <Filter className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="input icon-input input-with-icon ps-10 h-10 text-sm min-w-[160px]"
            >
              <option value="">{t('allServices')}</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {isRTL ? s.service_name.ar : s.service_name.en}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {activeTab === 'orders' && (
            <OrdersReport
              summary={ordersSummary}
              dailyData={dailyOrderData}
              peakHoursData={peakHoursData}
              cancellationByService={cancellationByService}
              orders={orderRows}
              currencySymbol={currencySymbol}
              t={t}
              locale={locale}
              isRTL={isRTL}
              formatDate={formatDate}
              formatFullDate={formatFullDate}
              getServiceName={getServiceName}
            />
          )}
          {activeTab === 'revenue' && (
            <RevenueReport
              summary={revenueSummary}
              dailyData={dailyRevenueData}
              topServices={topServices}
              topRooms={topRooms}
              currencySymbol={currencySymbol}
              t={t}
              isRTL={isRTL}
              formatDate={formatDate}
            />
          )}

        </>
      )}
    </div>
  )
}

/* ============================================================
   ORDERS REPORT
============================================================ */

interface OrdersReportProps {
  summary: OrdersSummary | null
  dailyData: DailyOrderData[]
  peakHoursData: PeakHourData[]
  cancellationByService: CancellationByService[]
  orders: OrderRow[]
  currencySymbol: string
  t: ReturnType<typeof useTranslations<'reports'>>
  locale: string
  isRTL: boolean
  formatDate: (d: string) => string
  formatFullDate: (d: string) => string
  getServiceName: (svc: { service_name: { ar: string; en: string } }) => string
}

function OrdersReport({ summary, dailyData, peakHoursData, cancellationByService, orders: _orders, currencySymbol: _currencySymbol, t, isRTL, formatDate }: OrdersReportProps) {
  if (!summary) return <EmptyState t={t} />

  // Determine grouping based on number of days in dailyData
  const numDays = dailyData.length
  type Granularity = 'day' | 'week' | 'month'
  const granularity: Granularity = numDays <= 14 ? 'day' : numDays <= 90 ? 'week' : 'month'

  const chartTitle = granularity === 'day'
    ? (isRTL ? 'الطلبات حسب اليوم' : 'Orders by Day')
    : granularity === 'week'
      ? (isRTL ? 'الطلبات حسب الأسبوع' : 'Orders by Week')
      : (isRTL ? 'الطلبات حسب الشهر' : 'Orders by Month')

  // Aggregate daily data into the right granularity
  const aggregatedData = (() => {
    if (granularity === 'day') return dailyData

    const buckets: Record<string, { label: string; total: number; completed: number; cancelled: number; newOrders: number; inProgress: number }> = {}
    for (const d of dailyData) {
      const date = new Date(d.date + 'T00:00:00')
      let key: string
      if (granularity === 'week') {
        // ISO week: Monday-based
        const day = date.getDay() || 7
        const monday = new Date(date)
        monday.setDate(date.getDate() - day + 1)
        key = monday.toISOString().split('T')[0]
      } else {
        key = d.date.substring(0, 7) // YYYY-MM
      }
      if (!buckets[key]) {
        const label = granularity === 'week'
          ? formatDate(key)
          : new Date(key + '-01T00:00:00').toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' })
        buckets[key] = { label, total: 0, completed: 0, cancelled: 0, newOrders: 0, inProgress: 0 }
      }
      buckets[key].total += d.total
      buckets[key].completed += d.completed
      buckets[key].cancelled += d.cancelled
      buckets[key].newOrders += d.newOrders
      buckets[key].inProgress += d.inProgress
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ date: v.label, ...v }))
  })()

  const topHours = [...peakHoursData].sort((a, b) => b.count - a.count).slice(0, 12).sort((a, b) => a.hour.localeCompare(b.hour))

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard icon={ClipboardList} label={t('totalOrders')} value={summary.totalOrders.toString()} color="blue" />
        <SummaryCard icon={CheckCircle2} label={t('completedOrders')} value={summary.completed.toString()} color="green" />
        <SummaryCard icon={XCircle} label={t('cancelledOrders')} value={summary.cancelled.toString()} color="red" />
        <SummaryCard icon={Target} label={t('completionRate')} value={`${summary.completionRate}%`} color="purple" />
        <SummaryCard
          icon={Timer}
          label={t('avgTime')}
          value={summary.avgCompletionTime != null ? `${summary.avgCompletionTime} ${t('minutes')}` : '—'}
          color="amber"
        />
      </div>

      {/* Charts row: Daily orders + Peak hours side by side */}
      {(aggregatedData.length > 0 || topHours.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Aggregated orders chart */}
          {aggregatedData.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-base font-semibold text-gray-900">{chartTitle}</h3>
              <div className="h-[240px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey={granularity === 'day' ? 'date' : 'label'} tickFormatter={granularity === 'day' ? formatDate : undefined} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip labelFormatter={granularity === 'day' ? (val) => formatDate(val as string) : undefined} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="completed" name={t('completed')} fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="newOrders" name={t('new')} fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="inProgress" name={t('inProgress')} fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cancelled" name={t('cancelled')} fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Peak hours chart */}
          {topHours.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-base font-semibold text-gray-900">
                {isRTL ? 'أوقات الذروة' : 'Peak Hours'}
              </h3>
              <div className="h-[240px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="count" name={isRTL ? 'طلبات' : 'Orders'} fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation rate per service */}
      {cancellationByService.filter(s => s.cancelled > 0).length > 0 && (
        <div className="card">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {isRTL ? 'معدل الإلغاء لكل خدمة' : 'Cancellation Rate by Service'}
          </h3>
          <div className="space-y-2.5">
            {cancellationByService.filter(s => s.cancelled > 0).slice(0, 5).map((s, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{isRTL ? s.serviceName.ar : s.serviceName.en}</span>
                  <span className={cn('font-semibold', s.rate > 20 ? 'text-red-600' : 'text-amber-600')}>
                    {s.rate}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={cn('h-2 rounded-full', s.rate > 20 ? 'bg-red-500' : 'bg-amber-400')}
                    style={{ width: `${Math.min(s.rate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


/* ============================================================
   REVENUE REPORT
============================================================ */

interface RevenueReportProps {
  summary: RevenueSummary | null
  dailyData: DailyRevenueData[]
  topServices: TopServiceRevenue[]
  topRooms: TopRoom[]
  currencySymbol: string
  t: ReturnType<typeof useTranslations<'reports'>>
  isRTL: boolean
  formatDate: (d: string) => string
}

function RevenueReport({ summary, dailyData, topServices, topRooms: _topRooms, currencySymbol, t, isRTL, formatDate }: RevenueReportProps) {
  if (!summary) return <EmptyState t={t} />

  // Dynamic grouping same as orders chart
  const numDays = dailyData.length
  type Granularity = 'day' | 'week' | 'month'
  const granularity: Granularity = numDays <= 14 ? 'day' : numDays <= 90 ? 'week' : 'month'

  const chartTitle = granularity === 'day'
    ? (isRTL ? 'الإيرادات حسب اليوم' : 'Revenue by Day')
    : granularity === 'week'
      ? (isRTL ? 'الإيرادات حسب الأسبوع' : 'Revenue by Week')
      : (isRTL ? 'الإيرادات حسب الشهر' : 'Revenue by Month')

  const aggregatedData = (() => {
    if (granularity === 'day') return dailyData

    const buckets: Record<string, { label: string; revenue: number; orders: number }> = {}
    for (const d of dailyData) {
      const date = new Date(d.date + 'T00:00:00')
      let key: string
      if (granularity === 'week') {
        const day = date.getDay() || 7
        const monday = new Date(date)
        monday.setDate(date.getDate() - day + 1)
        key = monday.toISOString().split('T')[0]
      } else {
        key = d.date.substring(0, 7)
      }
      if (!buckets[key]) {
        const label = granularity === 'week'
          ? formatDate(key)
          : new Date(key + '-01T00:00:00').toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', year: 'numeric' })
        buckets[key] = { label, revenue: 0, orders: 0 }
      }
      buckets[key].revenue += d.revenue
      buckets[key].orders += d.orders
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ date: v.label, ...v }))
  })()

  const pieData = topServices.map(s => ({
    name: isRTL ? s.serviceName.ar : s.serviceName.en,
    value: s.revenue,
  }))

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Banknote} label={t('totalRevenue')} value={`${summary.totalRevenue.toFixed(2)} ${currencySymbol}`} color="green" />
        <SummaryCard icon={ReceiptText} label={t('avgOrderValue')} value={`${summary.avgOrderValue.toFixed(2)} ${currencySymbol}`} color="blue" />
        <SummaryCard icon={ClipboardList} label={t('totalOrders')} value={summary.totalOrders.toString()} color="purple" />
      </div>

      {/* Charts side by side: Line chart + Pie chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue Line/Bar Chart */}
        {aggregatedData.length > 0 && (
          <div className="card">
            <h3 className="mb-3 text-base font-semibold text-gray-900">{chartTitle}</h3>
            <div className="h-[240px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aggregatedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey={granularity === 'day' ? 'date' : 'label'} tickFormatter={granularity === 'day' ? formatDate : undefined} tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip
                    labelFormatter={granularity === 'day' ? (val) => formatDate(val as string) : undefined}
                    formatter={(value: number) => [`${value.toFixed(2)} ${currencySymbol}`, t('revenue')]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="revenue" name={t('revenue')} stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="orders" name={t('orders')} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pie Chart: Top services by revenue */}
        {pieData.length > 0 && (
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Medal className="h-4 w-4 text-yellow-500" />
              {isRTL ? 'أفضل الخدمات إيراداً' : 'Top Services by Revenue'}
            </h3>
            <div className="flex items-center gap-4">
              <div className="h-[180px] w-[160px] shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={72} dataKey="value" paddingAngle={3}>
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} ${currencySymbol}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {topServices.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 truncate">{isRTL ? s.serviceName.ar : s.serviceName.en}</span>
                    </div>
                    <span className="shrink-0 font-semibold text-gray-900">{s.revenue.toFixed(0)} {currencySymbol}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


/* ============================================================
   SERVICES REPORT
============================================================ */

interface ServicesReportProps {
  servicesData: ServiceData[]
  currencySymbol: string
  t: ReturnType<typeof useTranslations<'reports'>>
  isRTL: boolean
}

function ServicesReport({ servicesData, currencySymbol, t, isRTL }: ServicesReportProps) {
  if (servicesData.length === 0) return <EmptyState t={t} />

  const chartData = servicesData.map((s) => ({
    name: isRTL ? s.serviceName.ar : s.serviceName.en,
    orders: s.orderCount,
    revenue: s.revenue,
  }))

  const maxOrders = Math.max(...servicesData.map(s => s.orderCount), 1)

  return (
    <div className="space-y-5">
      {/* Rankings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {servicesData.slice(0, 3).map((svc, i) => (
          <div key={i} className={cn('card border-2', i === 0 ? 'border-yellow-300 bg-yellow-50' : i === 1 ? 'border-gray-300 bg-gray-50' : 'border-amber-200 bg-amber-50')}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
                i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'
              )}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-gray-900">{isRTL ? svc.serviceName.ar : svc.serviceName.en}</p>
                <p className="text-sm text-gray-500">{svc.orderCount} {isRTL ? 'طلب' : 'orders'}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-green-600 font-medium">{svc.completionRate}% {isRTL ? 'إتمام' : 'completion'}</span>
                  <span className="text-gray-500">{svc.revenue.toFixed(0)} {currencySymbol}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">{t('ordersPerService')}</h3>
        <div className="h-[280px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Bar dataKey="orders" name={t('orders')} fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t('serviceName')}</th>
              <th>{t('orderCount')}</th>
              <th>{isRTL ? 'مكتملة' : 'Completed'}</th>
              <th>{isRTL ? 'ملغاة' : 'Cancelled'}</th>
              <th>{isRTL ? 'نسبة الإتمام' : 'Completion %'}</th>
              <th>{t('revenue')}</th>
              <th>{t('avgTime')}</th>
              <th>{isRTL ? 'الأداء' : 'Performance'}</th>
            </tr>
          </thead>
          <tbody>
            {servicesData.map((svc, i) => (
              <tr key={svc.serviceId}>
                <td className="text-gray-500">{i + 1}</td>
                <td className="font-medium text-gray-900">{isRTL ? svc.serviceName.ar : svc.serviceName.en}</td>
                <td>{svc.orderCount}</td>
                <td className="text-green-600">{svc.completed}</td>
                <td className="text-red-600">{svc.cancelled}</td>
                <td>
                  <span className={cn('font-semibold', svc.completionRate >= 80 ? 'text-green-600' : svc.completionRate >= 50 ? 'text-amber-600' : 'text-red-600')}>
                    {svc.completionRate}%
                  </span>
                </td>
                <td className="font-medium">{svc.revenue.toFixed(2)} {currencySymbol}</td>
                <td>{svc.avgTime != null ? `${svc.avgTime} ${t('minutes')}` : '—'}</td>
                <td>
                  <div className="h-2 w-20 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${Math.round((svc.orderCount / maxOrders) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============================================================
   SHARED COMPONENTS
============================================================ */

function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'reports'>> }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <FileText className="mb-3 h-12 w-12 text-gray-300" />
      <p className="text-lg font-medium">{t('noData')}</p>
    </div>
  )
}

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', icon: 'text-green-600' },
  red: { bg: 'bg-red-50', icon: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: string
}) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={cn('rounded-lg p-2', colors.bg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>
      </div>
      <span className="mt-2 block text-xl font-bold text-gray-900 leading-tight">{value}</span>
    </div>
  )
}
