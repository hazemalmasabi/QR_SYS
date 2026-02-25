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
      .select('order_id, status, total_amount, actual_time')
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

    const completedWithTime = ordersList.filter(
      (o) => o.status === 'completed' && o.actual_time != null
    )
    const avgCompletionTime =
      completedWithTime.length > 0
        ? completedWithTime.reduce(
          (sum, o) => sum + (o.actual_time || 0),
          0
        ) / completedWithTime.length
        : null

    // Fetch hotel currency symbol
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('currency_symbol')
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
        avgCompletionTime,
        currencySymbol: hotel?.currency_symbol || '$',
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
