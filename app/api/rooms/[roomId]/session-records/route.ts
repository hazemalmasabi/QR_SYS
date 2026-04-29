import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'unauthorized' }, { status: 401 })
    }

    const { roomId } = await params

    // 1. Get Room and active Session
    const { data: roomSession, error: rsError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .single()

    if (rsError || !roomSession) {
      return NextResponse.json({ success: false, message: 'noActiveSession' }, { status: 404 })
    }

    // 2. Get Orders for this session (or orphan orders for this room)
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('*, main_services(service_name)')
      .eq('room_id', roomId)
      .or(`session_id.eq.${roomSession.session_id},session_id.is.null`)

    if (session.role === 'service_supervisor' || session.role === 'service_employee') {
      if (session.assignedServiceId) {
        ordersQuery = ordersQuery.eq('service_id', session.assignedServiceId)
      }
    }

    const { data: dbOrders, error: ordersError } = await ordersQuery.order('created_at', { ascending: false })

    if (ordersError) {
      throw ordersError
    }

    // Filter orders: Include session orders OR orphans that were created AFTER the session began
    const orders = dbOrders?.filter(o => {
      if (o.session_id === roomSession.session_id) return true
      if (!o.session_id && o.created_at >= roomSession.check_in_time) return true
      return false
    }) || []

    // 3. Get Payments for this session
    let paymentsQuery = supabaseAdmin
      .from('payments')
      .select('*, employees!received_by_employee_id(full_name)')
      .eq('session_id', roomSession.session_id)

    if (session.role === 'service_supervisor' || session.role === 'service_employee') {
      if (session.assignedServiceId) {
        // Technically, a payment's location_id can track the service
        paymentsQuery = paymentsQuery.eq('location_id', session.assignedServiceId)
      }
    }

    const { data: payments, error: paymentsError } = await paymentsQuery.order('created_at', { ascending: false })

    if (paymentsError) {
      throw paymentsError
    }

    return NextResponse.json({
      success: true,
      guestSession: roomSession,
      orders,
      payments: payments || []
    })

  } catch (error) {
    console.error('Failed to fetch session records:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
