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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

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

    return NextResponse.json({
      success: true,
      rooms: rooms || [],
      total: count || 0,
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
