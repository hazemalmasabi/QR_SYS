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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const serviceId = searchParams.get('service_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

    // Build query for orders
    let query = supabaseAdmin
      .from('orders')
      .select(
        '*, rooms!inner(room_number), main_services!inner(service_name), employees(full_name)',
        { count: 'exact' }
      )
      .eq('hotel_id', session.hotelId)
      .order('created_at', { ascending: false })

    // Service staff can only see their assigned service orders
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      query = query.eq('service_id', session.assignedServiceId)
    }

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('order_number', `%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`)
    }

    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`)
    }

    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Orders fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orders: orders || [],
      total: count || 0,
      page,
    })
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
