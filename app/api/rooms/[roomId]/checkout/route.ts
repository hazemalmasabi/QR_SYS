import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params
    const roomId = params.roomId

    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'hotel_supervisor') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Find the active session for the room
    const { data: activeSession, error: checkError } = await supabaseAdmin
      .from('guest_sessions')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .maybeSingle()

    if (checkError) {
      console.error('Checkout check error:', checkError)
      return NextResponse.json(
        { success: false, message: 'databaseError' },
        { status: 500 }
      )
    }

    if (!activeSession) {
      return NextResponse.json(
        { success: false, message: 'noActiveSession' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { cancelPendingOrders } = body

    // 1. Fetch current session data
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('order_id, total_amount, paid_amount, status')
      .eq('session_id', activeSession.session_id)

    const hasPending = orders?.some(o => o.status !== 'completed' && o.status !== 'cancelled')

    if (hasPending) {
      if (cancelPendingOrders) {
        // First, handle paid pending orders: mark as completed
        await supabaseAdmin
          .from('orders')
          .update({ status: 'completed' })
          .eq('session_id', activeSession.session_id)
          .in('status', ['new', 'in_progress', 'under_modification'])
          .gte('paid_amount', 'total_amount') // This is a bit tricky in Supabase without raw SQL if columns are dynamic, but we'll try or use RPC if needed. 
          // Actually, since we already fetched 'orders' at line 55, we can use the IDs.

        const paidPendingIds = orders?.filter(o => (o.status !== 'completed' && o.status !== 'cancelled') && (Number(o.paid_amount || 0) >= Number(o.total_amount || 0))).map(o => o.order_id) || []
        const unpaidPendingIds = orders?.filter(o => (o.status !== 'completed' && o.status !== 'cancelled') && (Number(o.paid_amount || 0) < Number(o.total_amount || 0))).map(o => o.order_id) || []

        if (paidPendingIds.length > 0) {
          await supabaseAdmin.from('orders').update({ status: 'completed' }).in('order_id', paidPendingIds)
        }
        if (unpaidPendingIds.length > 0) {
          await supabaseAdmin.from('orders').update({ 
            status: 'cancelled', 
            cancellation_reason: 'Cancelled during check-out' 
          }).in('order_id', unpaidPendingIds)
        }
      } else {
        return NextResponse.json({ success: false, message: 'hasPendingOrders' }, { status: 400 })
      }
    }

    // 2. Calculate final balance for ALL room debt
    const { data: roomOrders } = await supabaseAdmin
      .from('orders')
      .select('total_amount, paid_amount, status')
      .eq('room_id', roomId)
      .or(`session_id.eq.${activeSession.session_id},session_id.is.null`)

    let totalOwed = 0
    let totalPaid = 0

    roomOrders?.forEach(o => {
      if (o.status !== 'cancelled') {
        totalOwed += Number(o.total_amount || 0)
        totalPaid += Number(o.paid_amount || 0)
      }
    })

    if (Number(totalOwed.toFixed(2)) > Number(totalPaid.toFixed(2))) {
      return NextResponse.json(
        { success: false, message: 'hasUnpaidBalance' },
        { status: 400 }
      )
    }

    // Close the session
    const { data: guestSession, error } = await supabaseAdmin
      .from('guest_sessions')
      .update({ status: 'checked_out', check_out_time: new Date().toISOString() })
      .eq('session_id', activeSession.session_id)
      .select()
      .single()

    if (error) {
      console.error('Checkout error:', error)
      return NextResponse.json(
        { success: false, message: 'databaseError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, guestSession })
  } catch (error) {
    console.error('Checkout API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
