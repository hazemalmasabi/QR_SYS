import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    // Look up room_qr_mappings by qr_code_id where is_active=true
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('room_qr_mappings')
      .select(`
        mapping_id,
        qr_code_id,
        room_id,
        hotel_id,
        is_active,
        rooms!inner (
          room_id,
          room_number,
          room_type,
          hotel_id,
          status
        ),
        hotels!inner (
          hotel_id,
          hotel_name,
          hotel_logo_url,
          timezone,
          currency_code,
          currency_symbol,
          language_secondary,
          hotel_name_translations
        )
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
    const hotel = mapping.hotels as unknown as Record<string, unknown>

    // Check if room is active
    if (room.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'roomInactive' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      room: {
        room_id: room.room_id,
        room_number: room.room_number,
        room_type: room.room_type,
      },
      hotel: {
        hotel_id: hotel.hotel_id,
        hotel_name: hotel.hotel_name,
        hotel_logo_url: hotel.hotel_logo_url,
        timezone: hotel.timezone,
        currency_code: hotel.currency_code,
        currency_symbol: hotel.currency_symbol,
        language_secondary: hotel.language_secondary || 'ar',
        hotel_name_translations: hotel.hotel_name_translations || { ar: hotel.hotel_name }
      },
    })
  } catch (error) {
    console.error('Guest QR validation error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
