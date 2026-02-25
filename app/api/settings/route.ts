import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { data: hotel, error } = await supabaseAdmin
      .from('hotels')
      .select('hotel_name, hotel_name_en, hotel_logo_url, barcode_text_ar, barcode_text_en, timezone, currency_code, currency_symbol, room_types')
      .eq('hotel_id', session.hotelId)
      .single()

    if (error || !hotel) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Get room counts per room type
    const { data: rooms } = await supabaseAdmin
      .from('rooms')
      .select('room_type')
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    const roomCounts: Record<string, number> = {}
    if (rooms) {
      rooms.forEach((r) => {
        if (r.room_type) {
          roomCounts[r.room_type] = (roomCounts[r.room_type] || 0) + 1
        }
      })
    }

    // Attach original_code and rooms_count to room_types so frontend can identify and show count
    if (hotel.room_types && Array.isArray(hotel.room_types)) {
      hotel.room_types = hotel.room_types.map((rt: any) => ({
        ...rt,
        original_code: rt.code,
        rooms_count: roomCounts[rt.code] || 0
      }))
    }

    return NextResponse.json({ success: true, settings: hotel })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    // Only hotel_supervisor can update settings
    if (session.role !== 'hotel_supervisor') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { hotel_name, hotel_name_en, hotel_logo_url, barcode_text_ar, barcode_text_en, timezone, currency_code, currency_symbol, room_types, room_type_mappings } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (hotel_name !== undefined) {
      if (!hotel_name || typeof hotel_name !== 'string' || hotel_name.trim().length < 2) {
        return NextResponse.json(
          { success: false, message: 'invalidHotelName' },
          { status: 400 }
        )
      }
      updateData.hotel_name = hotel_name.trim()
    }

    if (hotel_name_en !== undefined) {
      if (!hotel_name_en || typeof hotel_name_en !== 'string' || hotel_name_en.trim().length < 2) {
        return NextResponse.json(
          { success: false, message: 'invalidHotelNameEn' },
          { status: 400 }
        )
      }
      updateData.hotel_name_en = hotel_name_en.trim()
    }

    if (hotel_logo_url !== undefined) {
      updateData.hotel_logo_url = hotel_logo_url
    }

    if (barcode_text_ar !== undefined) {
      updateData.barcode_text_ar = barcode_text_ar
    }

    if (barcode_text_en !== undefined) {
      updateData.barcode_text_en = barcode_text_en
    }

    if (timezone !== undefined) {
      if (!timezone || typeof timezone !== 'string') {
        return NextResponse.json(
          { success: false, message: 'invalidTimezone' },
          { status: 400 }
        )
      }
      updateData.timezone = timezone
    }

    if (currency_code !== undefined) {
      if (!currency_code || typeof currency_code !== 'string') {
        return NextResponse.json(
          { success: false, message: 'invalidCurrency' },
          { status: 400 }
        )
      }
      updateData.currency_code = currency_code
    }

    if (currency_symbol !== undefined) {
      if (!currency_symbol || typeof currency_symbol !== 'string') {
        return NextResponse.json(
          { success: false, message: 'invalidCurrency' },
          { status: 400 }
        )
      }
      updateData.currency_symbol = currency_symbol
    }

    if (room_types !== undefined) {
      if (!Array.isArray(room_types)) {
        return NextResponse.json(
          { success: false, message: 'invalidRoomTypes' },
          { status: 400 }
        )
      }

      // Validate each room type
      for (const rt of room_types) {
        if (
          !rt.code ||
          typeof rt.code !== 'string' ||
          !rt.name_ar ||
          typeof rt.name_ar !== 'string' ||
          !rt.name_en ||
          typeof rt.name_en !== 'string'
        ) {
          return NextResponse.json(
            { success: false, message: 'invalidRoomTypes' },
            { status: 400 }
          )
        }
      }

      // Clean out original_code before saving since it's just for frontend tracking
      const cleanRoomTypes = room_types.map((rt: any) => ({
        code: rt.code,
        name_ar: rt.name_ar,
        name_en: rt.name_en
      }))

      updateData.room_types = cleanRoomTypes
    }

    // Handle room type mappings (moving rooms from deleted type to alternative)
    if (room_type_mappings && Array.isArray(room_type_mappings) && room_type_mappings.length > 0) {
      for (const mapping of room_type_mappings) {
        if (mapping.oldCode && mapping.newCode) {
          const { error: moveError } = await supabaseAdmin
            .from('rooms')
            .update({ room_type: mapping.newCode })
            .eq('hotel_id', session.hotelId)
            .eq('room_type', mapping.oldCode)

          if (moveError) {
            console.error(`Failed to move rooms from ${mapping.oldCode} to ${mapping.newCode}:`, moveError)
            return NextResponse.json(
              { success: false, message: 'updateRoomsError' },
              { status: 500 }
            )
          }
        }
      }
    }

    const { data: hotel, error } = await supabaseAdmin
      .from('hotels')
      .update(updateData)
      .eq('hotel_id', session.hotelId)
      .select('hotel_name, hotel_name_en, hotel_logo_url, barcode_text_ar, barcode_text_en, timezone, currency_code, currency_symbol, room_types')
      .single()

    if (error) {
      console.error('Settings update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, settings: hotel })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
