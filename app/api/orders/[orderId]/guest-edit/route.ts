import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = await request.json()
    const { action, order_items, notes, cancel_reason } = body

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 })
    }

    // First fetch the order to check its status
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, total_amount')
      .eq('order_id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
    }

    // Only allow guest edits if order is new or already under_modification
    if (order.status !== 'new' && order.status !== 'under_modification') {
      return NextResponse.json({ success: false, message: 'Order cannot be modified at this stage' }, { status: 403 })
    }

    if (action === 'start_edit') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'under_modification' })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel_edit') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'new' })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel_order') {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancel_reason || 'Cancelled by guest',
          cancelled_at: new Date().toISOString()
        })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'submit_edit') {
      // Recalculate total amount and individual totals
      let newTotal = 0
      const processedItems = []
      if (order_items && Array.isArray(order_items)) {
        for (const item of order_items) {
          const uPrice = item.price || item.unit_price || 0
          const q = item.quantity || 1
          const itemTotal = uPrice * q
          newTotal += itemTotal
          processedItems.push({
            ...item,
            unit_price: uPrice,
            total: itemTotal
          })
        }
      }

      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'new', // Return to new status so hotel can accept it
          order_items: processedItems,
          total_amount: newTotal,
          notes: notes !== undefined ? notes : null
        })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Guest Edit API error:', error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}
