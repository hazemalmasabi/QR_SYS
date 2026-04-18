import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || !session.employeeId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { orderId } = await params
    const body = await request.json()
    const { action, order_items, modification_reason } = body

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Invalid order ID' }, { status: 400 })
    }

    // First fetch the order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('status, hotel_id')
      .eq('order_id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 })
    }
    
    if (order.hotel_id !== session.hotelId) {
      return NextResponse.json({ success: false, message: 'Unauthorized to access this hotel' }, { status: 403 })
    }

    if (action === 'submit_edit') {
      if (!modification_reason || modification_reason.trim() === '') {
        return NextResponse.json({ success: false, message: 'Modification reason is required' }, { status: 400 })
      }

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
          order_items: processedItems,
          total_amount: newTotal,
          modification_reason: modification_reason
        })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }
    
    if (action === 'force_unlock') {
       const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'new' })
        .eq('order_id', orderId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Provider Edit API error:', error)
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 })
  }
}
