import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'orders'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const serviceId = searchParams.get('serviceId')

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { success: false, message: 'dateRange required' },
        { status: 400 }
      )
    }

    // Fetch hotel currency
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('currency_code, currency_symbol, timezone')
      .eq('hotel_id', session.hotelId)
      .single()

    const currencySymbol = hotel?.currency_symbol || '$'

    const baseFilters = {
      hotelId: session.hotelId,
      dateFrom: `${dateFrom}T00:00:00`,
      dateTo: `${dateTo}T23:59:59`,
      serviceId:
        session.role === 'service_supervisor' && session.assignedServiceId
          ? session.assignedServiceId
          : serviceId || null,
    }

    switch (type) {
      case 'orders':
        return await getOrdersReport(baseFilters, currencySymbol, hotel?.timezone || 'Asia/Riyadh')
      case 'revenue':
        return await getRevenueReport(baseFilters, currencySymbol, hotel?.timezone || 'Asia/Riyadh')
      case 'services':
        return await getServicesReport(baseFilters, currencySymbol, hotel?.timezone || 'Asia/Riyadh')
      default:
        return NextResponse.json(
          { success: false, message: 'invalid type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

interface BaseFilters {
  hotelId: string
  dateFrom: string
  dateTo: string
  serviceId: string | null
}

async function getOrdersReport(filters: BaseFilters, currencySymbol: string, timezone: string) {
  let query = supabaseAdmin
    .from('orders')
    .select(
      'order_id, order_number, room_id, service_id, total_amount, status, created_at, accepted_at, completed_at, cancelled_at, actual_time, cancellation_reason, rooms!inner(room_number), main_services!inner(service_name)'
    )
    .eq('hotel_id', filters.hotelId)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: true })

  if (filters.serviceId) {
    query = query.eq('service_id', filters.serviceId)
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Orders report error:', error)
    return NextResponse.json(
      { success: false, message: 'queryError' },
      { status: 500 }
    )
  }

  const ordersList = orders || []

  const totalOrders = ordersList.length
  const completed = ordersList.filter((o) => o.status === 'completed').length
  const cancelled = ordersList.filter((o) => o.status === 'cancelled').length
  const inProgress = ordersList.filter((o) => o.status === 'in_progress').length
  const newOrders = ordersList.filter((o) => o.status === 'new').length
  const completionRate =
    totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0

  const acceptedOrders = ordersList.filter((o) => o.accepted_at != null && o.created_at != null)
  let totalAcceptanceTime = 0
  acceptedOrders.forEach((o) => {
    const diff = new Date(o.accepted_at).getTime() - new Date(o.created_at).getTime()
    totalAcceptanceTime += diff
  })
  const avgAcceptanceTime =
    acceptedOrders.length > 0
      ? Math.round(totalAcceptanceTime / acceptedOrders.length / 60000)
      : null

  const executedOrders = ordersList.filter((o) => o.accepted_at != null && (o.status === 'completed' || o.status === 'cancelled'))
  let totalExecutionTime = 0
  executedOrders.forEach((o) => {
    if (o.actual_time != null) {
      totalExecutionTime += o.actual_time * 60000
    } else {
      const endTime = o.status === 'completed' ? o.completed_at : o.cancelled_at
      if (endTime) {
        const diff = new Date(endTime).getTime() - new Date(o.accepted_at).getTime()
        totalExecutionTime += diff
      }
    }
  })
  const avgExecutionTime =
    executedOrders.length > 0
      ? Math.round(totalExecutionTime / executedOrders.length / 60000)
      : null

  // Aggregate by day (timezone-aware)
  const byDay: Record<string, { date: string; total: number; completed: number; cancelled: number; newOrders: number; inProgress: number }> = {}
  for (const order of ordersList) {
    const day = new Date(order.created_at).toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const [m, d, y] = day.split('/')
    const formattedDay = `${y}-${m}-${d}`

    if (!byDay[formattedDay]) {
      byDay[formattedDay] = { date: formattedDay, total: 0, completed: 0, cancelled: 0, newOrders: 0, inProgress: 0 }
    }
    byDay[formattedDay].total++
    if (order.status === 'completed') byDay[formattedDay].completed++
    if (order.status === 'cancelled') byDay[formattedDay].cancelled++
    if (order.status === 'new') byDay[formattedDay].newOrders++
    if (order.status === 'in_progress') byDay[formattedDay].inProgress++
  }

  const dailyData = Object.values(byDay).sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  // Peak hours
  const hourCounts: number[] = Array(24).fill(0)
  for (const order of ordersList) {
    const hour = parseInt(new Date(order.created_at).toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit'
    }), 10)
    hourCounts[hour]++
  }
  const peakHoursData = hourCounts.map((count, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    count,
  }))

  // Cancellation reasons
  const reasonCounts: Record<string, number> = {}
  ordersList.forEach(o => {
    if (o.status === 'cancelled' && o.cancellation_reason) {
      const reason = o.cancellation_reason.trim()
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
    }
  })
  const topCancellationReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Cancellation rate per service
  const cancelByService: Record<string, { serviceName: { ar: string; en: string }; total: number; cancelled: number }> = {}
  for (const order of ordersList) {
    const svc = order.main_services as any
    const sid = order.service_id
    if (!cancelByService[sid]) {
      cancelByService[sid] = {
        serviceName: svc?.service_name || { ar: '—', en: '—' },
        total: 0,
        cancelled: 0,
      }
    }
    cancelByService[sid].total++
    if (order.status === 'cancelled') cancelByService[sid].cancelled++
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const cancellationByService = Object.values(cancelByService)
    .map((s) => ({
      serviceName: s.serviceName,
      total: s.total,
      cancelled: s.cancelled,
      rate: s.total > 0 ? Math.round((s.cancelled / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate)

  return NextResponse.json({
    success: true,
    type: 'orders',
    summary: {
      totalOrders,
      completed,
      cancelled,
      inProgress,
      newOrders,
      completionRate,
      avgAcceptanceTime,
      avgExecutionTime,
    },
    dailyData,
    peakHoursData,
    cancellationByService,
    topCancellationReasons,
    orders: ordersList,
    currencySymbol,
    timezone
  })
}

async function getRevenueReport(filters: BaseFilters, currencySymbol: string, timezone: string) {
  let query = supabaseAdmin
    .from('orders')
    .select(
      'order_id, total_amount, status, created_at, service_id, room_id, main_services!inner(service_name), rooms!inner(room_number)'
    )
    .eq('hotel_id', filters.hotelId)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (filters.serviceId) {
    query = query.eq('service_id', filters.serviceId)
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Revenue report error:', error)
    return NextResponse.json(
      { success: false, message: 'queryError' },
      { status: 500 }
    )
  }

  const ordersList = orders || []

  const totalRevenue = ordersList.reduce(
    (sum, o) => sum + (o.total_amount || 0),
    0
  )
  const avgOrderValue =
    ordersList.length > 0 ? totalRevenue / ordersList.length : 0

  // Aggregate revenue by day (timezone-aware)
  const byDay: Record<string, { date: string; revenue: number; orders: number }> = {}
  for (const order of ordersList) {
    const day = new Date(order.created_at).toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const [m, d, y] = day.split('/')
    const formattedDay = `${y}-${m}-${d}`

    if (!byDay[formattedDay]) {
      byDay[formattedDay] = { date: formattedDay, revenue: 0, orders: 0 }
    }
    byDay[formattedDay].revenue += order.total_amount || 0
    byDay[formattedDay].orders++
  }

  const dailyData = Object.values(byDay).sort((a, b) =>
    a.date.localeCompare(b.date)
  )

  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Top services by revenue
  const byService: Record<string, { serviceName: { ar: string; en: string }; revenue: number; orderCount: number }> = {}
  for (const order of ordersList) {
    const svc = order.main_services as any
    const sid = order.service_id
    if (!byService[sid]) {
      byService[sid] = {
        serviceName: svc?.service_name || { ar: '—', en: '—' },
        revenue: 0,
        orderCount: 0,
      }
    }
    byService[sid].revenue += order.total_amount || 0
    byService[sid].orderCount++
  }

  // Top rooms by revenue
  const byRoom: Record<string, { roomNumber: string; revenue: number; orderCount: number }> = {}
  for (const order of ordersList) {
    const rm = order.rooms as any
    const rid = order.room_id
    if (!byRoom[rid]) {
      byRoom[rid] = {
        roomNumber: rm?.room_number || '—',
        revenue: 0,
        orderCount: 0,
      }
    }
    byRoom[rid].revenue += order.total_amount || 0
    byRoom[rid].orderCount++
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const topServices = Object.values(byService)
    .map((s) => ({ ...s, revenue: Math.round(s.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const topRooms = Object.values(byRoom)
    .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return NextResponse.json({
    success: true,
    type: 'revenue',
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalOrders: ordersList.length,
    },
    dailyData,
    topServices,
    topRooms,
    currencySymbol,
    timezone
  })
}

async function getServicesReport(filters: BaseFilters, currencySymbol: string, timezone: string) {
  let query = supabaseAdmin
    .from('orders')
    .select(
      'order_id, service_id, total_amount, status, actual_time, created_at, main_services!inner(service_id, service_name)'
    )
    .eq('hotel_id', filters.hotelId)
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: true })

  if (filters.serviceId) {
    query = query.eq('service_id', filters.serviceId)
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Services report error:', error)
    return NextResponse.json(
      { success: false, message: 'queryError' },
      { status: 500 }
    )
  }

  const ordersList = orders || []

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const byService: Record<
    string,
    {
      serviceId: string
      serviceName: { ar: string; en: string }
      orderCount: number
      completed: number
      cancelled: number
      revenue: number
      totalTime: number
      timeCount: number
    }
  > = {}

  for (const order of ordersList) {
    const svc = order.main_services as any
    const sid = order.service_id
    if (!byService[sid]) {
      byService[sid] = {
        serviceId: sid,
        serviceName: svc?.service_name || { ar: '—', en: '—' },
        orderCount: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
        totalTime: 0,
        timeCount: 0,
      }
    }
    byService[sid].orderCount++
    if (order.status === 'completed') byService[sid].completed++
    if (order.status === 'cancelled') byService[sid].cancelled++
    if (order.status !== 'cancelled') {
      byService[sid].revenue += order.total_amount || 0
    }
    if (order.actual_time != null) {
      byService[sid].totalTime += order.actual_time
      byService[sid].timeCount++
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const servicesData = Object.values(byService)
    .map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      orderCount: s.orderCount,
      completed: s.completed,
      cancelled: s.cancelled,
      completionRate: s.orderCount > 0 ? Math.round((s.completed / s.orderCount) * 100) : 0,
      revenue: Math.round(s.revenue * 100) / 100,
      avgTime:
        s.timeCount > 0
          ? Math.round(s.totalTime / s.timeCount)
          : null,
    }))
    .sort((a, b) => b.orderCount - a.orderCount)

  return NextResponse.json({
    success: true,
    type: 'services',
    servicesData,
    currencySymbol,
    timezone
  })
}
