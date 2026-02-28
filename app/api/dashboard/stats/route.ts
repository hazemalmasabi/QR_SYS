import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    if (period === 'custom' && dateFrom && dateTo) {
      startDate = new Date(dateFrom + 'T00:00:00')
      endDate = new Date(dateTo + 'T23:59:59')
    } else {
      switch (period) {
        case '7d':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate = new Date(now)
          startDate.setDate(now.getDate() - 90)
          break
        default: // today
          startDate = new Date(now)
          startDate.setHours(0, 0, 0, 0)
      }
    }

    // Build query — filter by role
    let query = supabaseAdmin
      .from('orders')
      .select('order_id, status, total_amount, actual_time, created_at, accepted_at, completed_at, cancelled_at')
      .eq('hotel_id', session.hotelId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (
      (session.role === 'service_supervisor' ||
        session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      query = query.eq('service_id', session.assignedServiceId)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Stats query error:', error)
      return NextResponse.json(
        { success: false, message: 'queryError' },
        { status: 500 }
      )
    }

    const ordersList = orders || []

    // Aggregate stats
    const totalOrders = ordersList.length
    const newOrders = ordersList.filter((o) => o.status === 'new').length
    const inProgress = ordersList.filter(
      (o) => o.status === 'in_progress'
    ).length
    const completed = ordersList.filter(
      (o) => o.status === 'completed'
    ).length
    const cancelled = ordersList.filter(
      (o) => o.status === 'cancelled'
    ).length

    const totalRevenue = ordersList
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total_amount || 0), 0)

    const acceptedOrders = ordersList.filter((o) => o.accepted_at != null && o.created_at != null)
    let totalAcceptanceTime = 0
    acceptedOrders.forEach((o) => {
      const diff = new Date(o.accepted_at).getTime() - new Date(o.created_at).getTime()
      totalAcceptanceTime += diff
    })
    const avgAcceptanceTime =
      acceptedOrders.length > 0
        ? totalAcceptanceTime / acceptedOrders.length / 60000
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
        ? totalExecutionTime / executedOrders.length / 60000
        : null

    // Fetch hotel currency symbol and timezone
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('currency_symbol, timezone')
      .eq('hotel_id', session.hotelId)
      .single()

    // Fetch recent orders (last 10) with room + service info
    let recentQuery = supabaseAdmin
      .from('orders')
      .select(
        `
        order_id,
        order_number,
        total_amount,
        status,
        created_at,
        rooms!inner(room_number),
        main_services!inner(service_name)
      `
      )
      .eq('hotel_id', session.hotelId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (
      (session.role === 'service_supervisor' ||
        session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      recentQuery = recentQuery.eq('service_id', session.assignedServiceId)
    }

    const { data: recentOrders } = await recentQuery

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const formattedRecentOrders = (recentOrders || []).map((order: any) => ({
      order_id: order.order_id,
      order_number: order.order_number,
      room_number: order.rooms?.room_number || '—',
      service_name: order.main_services?.service_name || {
        ar: '—',
        en: '—',
      },
      total_amount: order.total_amount,
      status: order.status,
      created_at: order.created_at,
    }))
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        newOrders,
        inProgress,
        completed,
        cancelled,
        totalRevenue,
        avgAcceptanceTime,
        avgExecutionTime,
        currencySymbol: hotel?.currency_symbol || '$',
        timezone: hotel?.timezone || 'Asia/Riyadh',
        recentOrders: formattedRecentOrders,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
