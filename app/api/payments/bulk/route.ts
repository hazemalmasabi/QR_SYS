import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { room_id, amount, payment_method, service_id } = body

    if (!room_id || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ success: false, message: 'invalidAmount' }, { status: 400 })
    }

    // 1. Get Room and active Session
    const { data: roomSession, error: rsError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('room_id', room_id)
      .eq('status', 'active')
      .single()

    if (rsError || !roomSession) {
      return NextResponse.json({ success: false, message: 'noActiveSession' }, { status: 404 })
    }

    // 2. Fetch all Unpaid / Partial Orders for this session
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('*')
      .eq('room_id', room_id)
      .neq('status', 'cancelled')
      .neq('payment_status', 'paid_in_full')
      .order('created_at', { ascending: true }) // Oldest first to close invoices from oldest to newest

    // Standard rule: service_employee only sees their assigned service
    if (session.role === 'service_supervisor' || session.role === 'service_employee') {
      if (session.assignedServiceId) {
        ordersQuery = ordersQuery.eq('service_id', session.assignedServiceId)
      }
    } else if (service_id) {
       // Only if provided via the filter on the UI
       ordersQuery = ordersQuery.eq('service_id', service_id)
    }

    const { data: orders, error: ordersError } = await ordersQuery

    if (ordersError || !orders) {
      console.error('Orders fetch error:', ordersError)
      return NextResponse.json({ success: false, message: 'internalError' }, { status: 500 })
    }

    // Filter out already fully paid orders
    const unpaidOrders = orders.filter(o => {
      const remaining = o.total_amount - (o.paid_amount || 0)
      return remaining > 0
    })

    const totalRemaining = Number(unpaidOrders.reduce((sum, o) => sum + (o.total_amount - (o.paid_amount || 0)), 0).toFixed(2))
    let leftToAllocate = Number(Number(amount).toFixed(2))

    if (leftToAllocate > totalRemaining + 0.01) {
      return NextResponse.json({ success: false, message: 'amountExceedsBalance' }, { status: 400 })
    }

    if (leftToAllocate <= 0) {
       return NextResponse.json({ success: true, message: 'alreadyPaid' })
    }

    // 3. Distribute the payment
    for (const order of unpaidOrders) {
      if (leftToAllocate <= 0) break

      const orderRemaining = Number((order.total_amount - (order.paid_amount || 0)).toFixed(2))
      const alloc = Math.min(leftToAllocate, orderRemaining)
      
      leftToAllocate -= alloc
      leftToAllocate = Number(leftToAllocate.toFixed(2)) 

      const newPaidAmount = Number(((order.paid_amount || 0) + alloc).toFixed(2))
      const newStatus = newPaidAmount >= order.total_amount ? 'paid_in_full' : 'partial_paid'

      // Important: If it's an orphan order, link it to this session now
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: newStatus,
          paid_amount: newPaidAmount,
          session_id: order.session_id || roomSession.session_id // Link orphan to current session
        })
        .eq('order_id', order.order_id)

      if (updateError) {
        console.error('Failed to update order paid amount:', updateError)
        continue
      }

      const { error: paymentError } = await supabaseAdmin
        .from('payments')
        .insert({
          hotel_id: session.hotelId,
          session_id: roomSession.session_id,
          order_id: order.order_id,
          amount: alloc,
          payment_method: payment_method || 'cash',
          payment_type: 'payment',
          received_by_employee_id: session.employeeId,
          location_id: order.service_id, 
          notes: 'Settled via bulk payment'
        })
        
      if (paymentError) {
        console.error('Failed to create payment log:', paymentError)
      }
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Bulk Payment API error:', error)
    return NextResponse.json({ success: false, message: 'internalError' }, { status: 500 })
  }
}
