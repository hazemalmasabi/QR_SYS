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

    // Validate items exist and are available, get server-side prices and parent service
    const itemIds = items.map((i: { item_id: string }) => i.item_id)
    const { data: dbItems, error: itemsError } = await supabaseAdmin
      .from('items')
      .select('item_id, item_name, price, is_free, sub_service_id, sub_services!inner(parent_service_id)')
      .in('item_id', itemIds)
      .eq('availability_status', 'available')
      .is('deleted_at', null)

    if (itemsError || !dbItems || dbItems.length !== itemIds.length) {
      return NextResponse.json(
        { success: false, message: 'invalidItems' },
        { status: 400 }
      )
    }

    // Group items by main service_id
    type GroupedOrder = {
      serviceId: string;
      subServiceId: string;
      orderItems: any[];
      totalAmount: number;
    }
    const groupedOrders = new Map<string, GroupedOrder>()

    for (const clientItem of items) {
      const dbItem = dbItems.find((di) => di.item_id === clientItem.item_id)!
      // Extract service_id from the joined sub_services table
      const serviceId = (dbItem.sub_services as any).parent_service_id

      const quantity = Math.max(1, Math.floor(clientItem.quantity))
      const unitPrice = dbItem.is_free ? 0 : dbItem.price
      const orderItem = {
        item_id: dbItem.item_id,
        item_name: dbItem.item_name,
        quantity,
        unit_price: unitPrice,
        total: unitPrice * quantity,
      }

      if (!groupedOrders.has(serviceId)) {
        groupedOrders.set(serviceId, {
          serviceId,
          subServiceId: dbItem.sub_service_id, // Take first sub-service ID as representative if mixing
          orderItems: [],
          totalAmount: 0
        })
      }

      const group = groupedOrders.get(serviceId)!
      group.orderItems.push(orderItem)
      group.totalAmount += orderItem.total
    }

    // Generate sequential order numbers based on today's date in local time
    const today = new Date()
    const saudiTime = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))

    const yy = String(saudiTime.getFullYear()).slice(-2)
    const mm = String(saudiTime.getMonth() + 1).padStart(2, '0')
    const dd = String(saudiTime.getDate()).padStart(2, '0')
    const datePrefix = `ORD-${yy}${mm}${dd}-`

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

    const insertedOrders = []

    // Insert each grouped order independently
    for (const group of Array.from(groupedOrders.values())) {
      const orderNumber = `${datePrefix}${String(sequence).padStart(3, '0')}`
      sequence++ // Increment for the next possible order in this loop

      const serviceNotes = (notes && typeof notes === 'object') ? notes[group.serviceId] : notes

      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          order_number: orderNumber,
          room_id: mapping.room_id,
          hotel_id: mapping.hotel_id,
          service_id: group.serviceId,
          sub_service_id: group.subServiceId,
          order_items: group.orderItems,
          total_amount: group.totalAmount,
          currency_code: hotel?.currency_code || 'SAR',
          status: 'new',
          notes: serviceNotes || null,
        })
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error for service', group.serviceId, ':', orderError)
        // If an insert fails, we throw an error. In a more complete system we might use transactions,
        // but Supabase JS doesn't support multiple inserts across tables natively as a transaction block easily without RPC.
        // In our case we are just inserting multiple rows to the same table.
        // We could use insert([...groups]), but we need sequential order numbers perfectly returned.
        throw new Error('Partial order creation failure')
      }

      insertedOrders.push(order)
    }

    return NextResponse.json({
      success: true,
      orders: insertedOrders,
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

    // Passive cleanup: cancel orders stuck in 'under_modification' for > 10 mins
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    try {
      await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'cancelled', 
          cancellation_reason: 'autoCancelledTimeout',
          cancelled_at: new Date().toISOString()
        })
        .eq('status', 'under_modification')
        .lt('updated_at', tenMinutesAgo)
    } catch (cleanupError) {
      console.error('Passive cleanup error:', cleanupError)
      // We continue even if cleanup fails to avoid blocking the guest
    }

    // Fetch active orders (new, in_progress, under_modification)
    const { data: activeOrders, error: activeError } = await supabaseAdmin
      .from('orders')
      .select('*, main_services(service_name)')
      .eq('room_id', mapping.room_id)
      .eq('hotel_id', mapping.hotel_id)
      .in('status', ['new', 'in_progress', 'under_modification'])
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
