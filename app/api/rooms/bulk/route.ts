import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role !== 'hotel_supervisor' && !session.isPrimarySupervisor) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { rooms } = await request.json()

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json(
        { success: false, message: 'noData' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const now = new Date().toISOString()
    const hotelId = session.hotelId

    // Fetch existing room numbers to avoid duplicates
    const { data: existingRooms } = await supabaseAdmin
      .from('rooms')
      .select('room_number')
      .eq('hotel_id', hotelId)
      .is('deleted_at', null)

    const existingSet = new Set(existingRooms?.map((r) => r.room_number) || [])

    const newRooms = []
    const qrMappings = []

    for (const roomRaw of rooms) {
      const roomNumber = String(roomRaw.room_number || '').trim()

      if (!roomNumber) continue
      if (existingSet.has(roomNumber)) continue

      const qrCodeId = randomUUID()
      const qrUrl = `${appUrl}/guest/${qrCodeId}`
      const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 2 })

      const newRoomId = randomUUID()

      newRooms.push({
        room_id: newRoomId,
        hotel_id: hotelId,
        room_number: roomNumber,
        floor_number: roomRaw.floor_number || null,
        room_type: roomRaw.room_type || 'standard',
        notes: roomRaw.notes || null,
        qr_code: qrCodeId,
        status: 'active',
        created_at: now,
        updated_at: now,
      })

      qrMappings.push({
        qr_code_id: qrCodeId,
        room_id: newRoomId,
        hotel_id: hotelId,
        qr_image_url: qrDataUrl,
        is_active: true,
        created_at: now,
      })
      
      existingSet.add(roomNumber)
    }

    if (newRooms.length === 0) {
      return NextResponse.json(
        { success: false, message: 'allDuplicatesOrInvalid' },
        { status: 400 }
      )
    }

    // Insert rooms
    const { error: roomsError } = await supabaseAdmin
      .from('rooms')
      .insert(newRooms)

    if (roomsError) {
      console.error('Bulk rooms insert error:', roomsError)
      return NextResponse.json(
        { success: false, message: 'insertError' },
        { status: 500 }
      )
    }

    // Insert QR Mappings
    const { error: qrError } = await supabaseAdmin
      .from('room_qr_mappings')
      .insert(qrMappings)

    if (qrError) {
      console.error('Bulk QR mapping error:', qrError)
      // Note: If this fails, the rooms exist but qrs are missing mappings. We might still return partial success.
    }

    return NextResponse.json(
      { success: true, count: newRooms.length },
      { status: 201 }
    )
  } catch (error) {
    console.error('Rooms Bulk POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
