import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { randomUUID } from 'crypto'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
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

    const { roomId } = await params

    // Check room exists and belongs to this hotel
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('room_id, hotel_id, room_number')
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (!room) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Deactivate any existing QR mappings for this room
    await supabaseAdmin
      .from('room_qr_mappings')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)

    // Generate new unique QR code ID
    const qrCodeId = randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrUrl = `${appUrl}/guest/${qrCodeId}`

    // Generate QR code image as data URL
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })

    const now = new Date().toISOString()

    // Update the room's qr_code field
    const { error: updateError } = await supabaseAdmin
      .from('rooms')
      .update({ qr_code: qrCodeId, updated_at: now })
      .eq('room_id', roomId)

    if (updateError) {
      console.error('Room QR update error:', updateError)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    // Create new QR mapping record
    const { error: insertError } = await supabaseAdmin
      .from('room_qr_mappings')
      .insert({
        qr_code_id: qrCodeId,
        room_id: roomId,
        hotel_id: session.hotelId,
        qr_image_url: qrDataUrl,
        is_active: true,
        created_at: now,
      })

    if (insertError) {
      console.error('QR mapping insert error:', insertError)
      return NextResponse.json(
        { success: false, message: 'insertError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qrCodeId,
      qrCodeUrl: qrUrl,
      qrImageDataUrl: qrDataUrl,
      roomNumber: room.room_number,
    })
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
