import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = await params

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*, rooms!inner(room_number), main_services!inner(service_name), employees(full_name)')
      .eq('order_id', orderId)
      .eq('hotel_id', session.hotelId)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Service staff can only see their assigned service orders
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId &&
      order.service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Fetch hotel timezone
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('timezone')
      .eq('hotel_id', session.hotelId)
      .single()

    return NextResponse.json({ success: true, order, timezone: hotel?.timezone || 'Asia/Riyadh' })
  } catch (error) {
    console.error('Order detail error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { orderId } = await params
    const body = await request.json()
    const { status: newStatus, cancellation_reason } = body

    if (!newStatus) {
      return NextResponse.json(
        { success: false, message: 'statusRequired' },
        { status: 400 }
      )
    }

    // Fetch current order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('hotel_id', session.hotelId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Service staff can only update orders for their assigned service
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId &&
      order.service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Validate state transition
    const allowedTransitions = VALID_TRANSITIONS[order.status]
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: 'invalidTransition' },
        { status: 400 }
      )
    }

    // Cancellation requires a reason
    if (newStatus === 'cancelled' && !cancellation_reason?.trim()) {
      return NextResponse.json(
        { success: false, message: 'cancelReasonRequired' },
        { status: 400 }
      )
    }

    // Build update payload
    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: now,
    }

    if (newStatus === 'in_progress') {
      updateData.accepted_at = now
      updateData.handled_by = session.employeeId
    } else if (newStatus === 'completed') {
      updateData.completed_at = now
      // Calculate actual time in minutes from accepted_at to now
      if (order.accepted_at) {
        const acceptedTime = new Date(order.accepted_at).getTime()
        const completedTime = new Date(now).getTime()
        updateData.actual_time = Math.round(
          (completedTime - acceptedTime) / (1000 * 60)
        )
      }
    } else if (newStatus === 'cancelled') {
      updateData.cancelled_at = now
      updateData.cancellation_reason = cancellation_reason.trim()
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('order_id', orderId)
      .select('*, rooms!inner(room_number), main_services!inner(service_name), employees(full_name)')
      .single()

    if (updateError) {
      console.error('Order update error:', updateError)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Order PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
