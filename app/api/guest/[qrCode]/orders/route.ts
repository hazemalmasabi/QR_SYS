import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params
    const body = await request.json()

    // Validate QR code and get room/hotel info
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('room_qr_mappings')
      .select(`
        room_id,
        hotel_id,
        rooms!inner (status)
      `)
      .eq('qr_code_id', qrCode)
      .eq('is_active', true)
      .single()

    if (mappingError || !mapping) {
      return NextResponse.json(
        { success: false, message: 'invalidQR' },
        { status: 404 }
      )
    }

    const room = mapping.rooms as unknown as Record<string, unknown>
    if (room.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'roomInactive' },
        { status: 400 }
      )
    }

    const { items, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'noItems' },
        { status: 400 }
      )
    }

    // Get hotel currency
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('currency_code')
      .eq('hotel_id', mapping.hotel_id)
      .single()

    // Validate items exist and are available, get server-side prices
    const itemIds = items.map((i: { item_id: string }) => i.item_id)
    const { data: dbItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('item_id, item_name, price, sub_service_id')
      .in('item_id', itemIds)
      .eq('availability_status', 'available')
      .is('deleted_at', null)

    if (itemsError || !dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, message: 'invalidItems' },
        { status: 400 }
      )
    }

    // Calculate total from server-side prices
    const orderItems = items.map((clientItem: { item_id: string; quantity: number }) => {
      const dbItem = dbItems.find((di) => di.item_id === clientItem.item_id)!
      const quantity = Math.max(1, Math.floor(clientItem.quantity))
      return {
        item_id: dbItem.item_id,
        item_name: dbItem.item_name,
        quantity,
        unit_price: dbItem.price,
        total: dbItem.price * quantity,
      }
    })

    const totalAmount = orderItems.reduce((sum: number, oi: { total: number }) => sum + oi.total, 0)

    // Resolve service_id and sub_service_id from the items' sub-service
    const subServiceId = dbItems[0]?.sub_service_id || null
    let serviceId: string | null = null

    if (subServiceId) {
      const { data: subService } = await supabaseAdmin
        .from('sub_services')
        .select('parent_service_id')
        .eq('sub_service_id', subServiceId)
        .single()

      serviceId = subService?.parent_service_id || null
    }

    if (!serviceId) {
      return NextResponse.json(
        { success: false, message: 'invalidService' },
        { status: 400 }
      )
    }

    // Generate sequential order number (e.g. ORD-YYMMDD-XXX)
    // 1. Get current date in hotel's timezone (assuming standard UTC+3 for SA for now, or just server date)
    const today = new Date()
    // Convert to Saudi time (UTC+3) for standard local date
    const saudiTime = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))

    const yy = String(saudiTime.getFullYear()).slice(-2)
    const mm = String(saudiTime.getMonth() + 1).padStart(2, '0')
    const dd = String(saudiTime.getDate()).padStart(2, '0')
    const datePrefix = `ORD-${yy}${mm}${dd}-`

    // 2. Find the latest order for this hotel today
    const startOfDay = new Date(saudiTime.setHours(0, 0, 0, 0)).toISOString()
    const endOfDay = new Date(saudiTime.setHours(23, 59, 59, 999)).toISOString()

    const { data: latestOrder } = await supabaseAdmin
      .from('orders')
      .select('order_number')
      .eq('hotel_id', mapping.hotel_id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sequence = 1
    if (latestOrder && latestOrder.order_number?.startsWith(datePrefix)) {
      const parts = latestOrder.order_number.split('-')
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1
      }
    }

    const orderNumber = `${datePrefix}${String(sequence).padStart(3, '0')}`

    // Insert into orders table
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        room_id: mapping.room_id,
        hotel_id: mapping.hotel_id,
        service_id: serviceId,
        sub_service_id: subServiceId,
        order_items: orderItems,
        total_amount: totalAmount,
        currency_code: hotel?.currency_code || 'SAR',
        status: 'new',
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { success: false, message: 'orderCreationFailed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    }, { status: 201 })
  } catch (error) {
    console.error('Guest order creation error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    // Validate QR code and get room info
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('room_qr_mappings')
      .select('room_id, hotel_id')
      .eq('qr_code_id', qrCode)
      .eq('is_active', true)
      .single()

    if (mappingError || !mapping) {
      return NextResponse.json(
        { success: false, message: 'invalidQR' },
        { status: 404 }
      )
    }

    // Fetch active orders (new, in_progress)
    const { data: activeOrders, error: activeError } = await supabaseAdmin
      .from('orders')
      .select('*, main_services(service_name)')
      .eq('room_id', mapping.room_id)
      .eq('hotel_id', mapping.hotel_id)
      .in('status', ['new', 'in_progress'])
      .order('created_at', { ascending: false })

    if (activeError) {
      console.error('Active orders fetch error:', activeError)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    // Fetch completed/cancelled orders within last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: recentOrders, error: recentError } = await supabaseAdmin
      .from('orders')
      .select('*, main_services(service_name)')
      .eq('room_id', mapping.room_id)
      .eq('hotel_id', mapping.hotel_id)
      .in('status', ['completed', 'cancelled'])
      .gte('updated_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (recentError) {
      console.error('Recent orders fetch error:', recentError)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      activeOrders: activeOrders || [],
      recentOrders: recentOrders || [],
    })
  } catch (error) {
    console.error('Guest orders fetch error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
