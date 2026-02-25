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

    // Check room exists
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('room_id, hotel_id')
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

    // Deactivate old QR mappings
    await supabaseAdmin
      .from('room_qr_mappings')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)

    // Generate new QR code
    const qrCodeId = randomUUID()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrUrl = `${appUrl}/guest/${qrCodeId}`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 400, margin: 2 })

    const now = new Date().toISOString()

    // Update room's qr_code field
    await supabaseAdmin
      .from('rooms')
      .update({ qr_code: qrCodeId, updated_at: now })
      .eq('room_id', roomId)

    // Create new QR mapping
    await supabaseAdmin.from('room_qr_mappings').insert({
      qr_code_id: qrCodeId,
      room_id: roomId,
      hotel_id: session.hotelId,
      qr_image_url: qrDataUrl,
      is_active: true,
      created_at: now,
    })

    return NextResponse.json({
      success: true,
      qrCodeUrl: qrUrl,
      qrImageDataUrl: qrDataUrl,
      qrCodeId,
    })
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
