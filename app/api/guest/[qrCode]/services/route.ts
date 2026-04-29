import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode } = await params

    // Get hotel_id and room_id from QR code mapping
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('room_qr_mappings')
      .select('hotel_id, room_id')
      .eq('qr_code_id', qrCode)
      .eq('is_active', true)
      .single()

    if (mappingError || !mapping) {
      return NextResponse.json(
        { success: false, message: 'invalidQR' },
        { status: 404 }
      )
    }

    // Check for active session
    const { data: session } = await supabaseAdmin
      .from('guest_sessions')
      .select('session_id')
      .eq('room_id', mapping.room_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'noActiveSession' },
        { status: 403 }
      )
    }

    // Fetch active main_services for the hotel
    const { data: services, error: servicesError } = await supabaseAdmin
      .from('main_services')
      .select('service_id, service_name, description, image_url, availability_type, start_time, end_time, estimated_time_min, estimated_time_max, estimated_time_unit, display_order')
      .eq('hotel_id', mapping.hotel_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (servicesError) {
      console.error('Services fetch error:', servicesError)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      services: services || [],
    })
  } catch (error) {
    console.error('Guest services error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
