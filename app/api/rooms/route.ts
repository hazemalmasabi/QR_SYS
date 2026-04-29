import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { randomUUID } from 'crypto'

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
    const search = searchParams.get('search')
    const floor = searchParams.get('floor')
    const roomType = searchParams.get('room_type')
    const status = searchParams.get('status')
    const unpaidOnly = searchParams.get('unpaid_only') === 'true'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit
    
    // Support service-specific balance
    let serviceIdFilter = searchParams.get('service_id')
    if (!serviceIdFilter && (session.role === 'service_supervisor' || session.role === 'service_employee')) {
       serviceIdFilter = session.assignedServiceId || null
    }

    let query = supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact' })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .order('room_number', { ascending: true })

    if (search) {
      query = query.ilike('room_number', `%${search}%`)
    }

    if (floor) {
      query = query.eq('floor_number', parseInt(floor, 10))
    }

    if (roomType) {
      query = query.eq('room_type', roomType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination range if limit is greater than 0
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: rooms, error, count } = await query

    if (error) {
      console.error('Rooms fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    const roomIds = rooms?.map(r => r.room_id) || []
    let activeSessions: any[] = []
    if (roomIds.length > 0) {
      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from('guest_sessions')
        .select('*')
        .in('room_id', roomIds)
        .eq('status', 'active')
      
      if (!sessionsError && sessions) {
        activeSessions = sessions
      }
    }

    // Fetch current balance for each room
    let roomBalances: Record<string, number> = {}
    if (roomIds.length > 0) {
      // Get all active session IDs to filter orders correctly
      const activeSessionIds = activeSessions.map(s => s.session_id)

      let ordersQuery = supabaseAdmin
        .from('orders')
        .select('room_id, total_amount, paid_amount, session_id, created_at')
        .in('room_id', roomIds)
        .neq('status', 'cancelled')
        .gt('total_amount', 0)
      
      if (serviceIdFilter) {
         ordersQuery = ordersQuery.eq('service_id', serviceIdFilter)
      }

      const { data: allUnpaidOrders } = await ordersQuery

      if (allUnpaidOrders) {
        allUnpaidOrders.forEach(order => {
          // Rule: Only count orders if they are:
          // 1. Orphan orders (no session_id) AND created after the session began (if session exists)
          // 2. OR belong to an active session
          const session = activeSessions.find(s => s.room_id === order.room_id)
          const isActiveSessionOrder = order.session_id && activeSessionIds.includes(order.session_id)
          
          let isOrphanOrder = false
          if (!order.session_id) {
             // If there is an active session, orphan must be after check-in
             if (session) {
                isOrphanOrder = order.created_at >= session.check_in_time
             } else {
                isOrphanOrder = true 
             }
          }

          if (isActiveSessionOrder || isOrphanOrder) {
            const unpaid = Number(order.total_amount || 0) - Number(order.paid_amount || 0)
            if (unpaid > 0) {
              roomBalances[order.room_id] = (roomBalances[order.room_id] || 0) + unpaid
            }
          }
        })
      }
    }

    let filteredRooms = rooms?.map(room => ({
      ...room,
      current_session: activeSessions.find(s => s.room_id === room.room_id) || null,
      balance: Number((roomBalances[room.room_id] || 0).toFixed(2))
    })) || []

    const totalBalance = Number(Object.values(roomBalances).reduce((a, b) => a + b, 0).toFixed(2))

    if (unpaidOnly) {
      filteredRooms = filteredRooms.filter(r => r.balance > 0)
    }

    return NextResponse.json({
      success: true,
      rooms: filteredRooms,
      total: unpaidOnly ? filteredRooms.length : (count || 0),
      totalBalance,
      page,
      limit
    })
  } catch (error) {
    console.error('Rooms API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json()
    const { room_number, floor_number, room_type, notes } = body

    if (!room_number || !room_type) {
      return NextResponse.json(
        { success: false, message: 'missingFields' },
        { status: 400 }
      )
    }

    // Check for duplicate room number within hotel
    const { data: existing } = await supabaseAdmin
      .from('rooms')
      .select('room_id')
      .eq('hotel_id', session.hotelId)
      .eq('room_number', room_number)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'duplicateRoom' },
        { status: 409 }
      )
    }

    // Generate QR code
    const qrCodeId = randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrUrl = `${appUrl}/guest/${qrCodeId}`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 2 })

    const now = new Date().toISOString()

    // Create the room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert({
        hotel_id: session.hotelId,
        room_number,
        floor_number: floor_number || null,
        room_type,
        notes: notes || null,
        qr_code: qrCodeId,
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (roomError) {
      console.error('Room create error:', roomError)
      return NextResponse.json(
        { success: false, message: 'createError' },
        { status: 500 }
      )
    }

    // Save QR mapping
    await supabaseAdmin.from('room_qr_mappings').insert({
      qr_code_id: qrCodeId,
      room_id: room.room_id,
      hotel_id: session.hotelId,
      qr_image_url: qrDataUrl,
      is_active: true,
      created_at: now,
    })

    return NextResponse.json(
      { success: true, room, qrCodeUrl: qrUrl, qrImageDataUrl: qrDataUrl },
      { status: 201 }
    )
  } catch (error) {
    console.error('Rooms POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
