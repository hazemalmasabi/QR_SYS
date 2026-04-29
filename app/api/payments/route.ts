import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeId = searchParams.get('employeeId')
    const locationId = searchParams.get('locationId')

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabaseAdmin
      .from('payments')
      .select('*, employees!received_by_employee_id(full_name), orders!order_id(order_number), guest_sessions!session_id(room_id, rooms!room_id(room_number))', { count: 'exact' })
      .eq('hotel_id', session.hotelId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }
    if (employeeId) {
      query = query.eq('received_by_employee_id', employeeId)
    }
    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    // Role-based filtering: service staff can only see their own interactions or location
    if (session.role === 'service_supervisor' || session.role === 'service_employee') {
      if (session.assignedServiceId) {
         query = query.eq('location_id', session.assignedServiceId)
      } else {
         query = query.eq('received_by_employee_id', session.employeeId)
      }
    }

    const { data: payments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Payments fetch error:', error)
      return NextResponse.json({ success: false, message: 'fetchError' }, { status: 500 })
    }

    // Get Total Paid for summary
    let sumQuery = supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('hotel_id', session.hotelId)
    
    if (startDate) sumQuery = sumQuery.gte('created_at', startDate)
    if (endDate) sumQuery = sumQuery.lte('created_at', endDate)
    if (locationId) sumQuery = sumQuery.eq('location_id', locationId)
    if (employeeId) sumQuery = sumQuery.eq('received_by_employee_id', employeeId)
    
    if (session.role === 'service_supervisor' || session.role === 'service_employee') {
      if (session.assignedServiceId) {
         sumQuery = sumQuery.eq('location_id', session.assignedServiceId)
      } else {
         sumQuery = sumQuery.eq('received_by_employee_id', session.employeeId)
      }
    }

    const { data: paymentsData } = await sumQuery
    const totalPaid = paymentsData?.reduce((acc, p) => acc + Number(p.amount || 0), 0) || 0

    // Get Total Remaining (Unpaid orders)
    let remainQuery = supabaseAdmin
      .from('orders')
      .select('total_amount, paid_amount')
      .eq('hotel_id', session.hotelId)
      .neq('status', 'cancelled')
    
    if (startDate) remainQuery = remainQuery.gte('created_at', startDate)
    if (endDate) remainQuery = remainQuery.lte('created_at', endDate)
    if (locationId) remainQuery = remainQuery.eq('service_id', locationId)
    else if (session.role === 'service_supervisor' || session.role === 'service_employee') {
       if (session.assignedServiceId) {
          remainQuery = remainQuery.eq('service_id', session.assignedServiceId)
       }
    }

    const { data: ordersData } = await remainQuery
    const totalRemaining = ordersData?.reduce((acc, order) => {
       const unpaid = Number(order.total_amount || 0) - Number(order.paid_amount || 0)
       return acc + (unpaid > 0 ? unpaid : 0)
    }, 0) || 0

    return NextResponse.json({ 
      success: true, 
      payments, 
      total: count || 0,
      summary: {
        totalPaid,
        totalRemaining
      },
      userRole: session.role,
      assignedServiceId: session.assignedServiceId
    })
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json({ success: false, message: 'internalError' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, payment_method, payment_type, notes, location_id, session_id, order_id } = body

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ success: false, message: 'invalidAmount' }, { status: 400 })
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        hotel_id: session.hotelId,
        session_id: session_id || null,
        order_id: order_id || null,
        amount: Number(amount),
        payment_method: payment_method || 'cash',
        payment_type: payment_type || 'payment',
        received_by_employee_id: session.employeeId,
        location_id: location_id || session.assignedServiceId || null,
        notes: notes || null
      })
      .select('*, employees!received_by_employee_id(full_name)')
      .single()

    if (error) {
      console.error('Payment creation error:', error)
      return NextResponse.json({ success: false, message: 'createError' }, { status: 500 })
    }

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (error) {
    console.error('Payment POST error:', error)
    return NextResponse.json({ success: false, message: 'internalError' }, { status: 500 })
  }
}
