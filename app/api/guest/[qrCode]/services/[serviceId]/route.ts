import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ qrCode: string; serviceId: string }> }
) {
  try {
    const { qrCode, serviceId } = await params

    // Validate QR code
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('room_qr_mappings')
      .select('hotel_id, hotels!inner(timezone)')
      .eq('qr_code_id', qrCode)
      .eq('is_active', true)
      .single()

    if (mappingError || !mapping) {
      return NextResponse.json(
        { success: false, message: 'invalidQR' },
        { status: 404 }
      )
    }

    // Verify the service belongs to this hotel
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('main_services')
      .select('service_id, service_name, description, image_url, availability_type, start_time, end_time')
      .eq('service_id', serviceId)
      .eq('hotel_id', mapping.hotel_id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, message: 'serviceNotFound' },
        { status: 404 }
      )
    }

    // Fetch active sub_services for this service
    const { data: subServices, error: subError } = await supabaseAdmin
      .from('sub_services')
      .select('sub_service_id, sub_service_name, description, image_url, display_order, availability_type, start_time, end_time')
      .eq('parent_service_id', serviceId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (subError) {
      console.error('Sub-services fetch error:', subError)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    // For each sub-service, fetch available items
    const subServicesWithItems = await Promise.all(
      (subServices || []).map(async (sub) => {
        const { data: items } = await supabaseAdmin
          .from('items')
          .select('item_id, item_name, description, image_url, price, is_free, availability_status, sub_service_id, display_order')
          .eq('sub_service_id', sub.sub_service_id)
          .is('deleted_at', null)
          .order('availability_status', { ascending: false }) // 'available' > 'unavailable' alphabetically
          .order('display_order', { ascending: true })

        return {
          ...sub,
          items: items || [],
        }
      })
    )

    const hotel = mapping.hotels as unknown as { timezone: string }

    return NextResponse.json({
      success: true,
      service,
      subServices: subServicesWithItems,
      timezone: hotel.timezone || 'Asia/Riyadh',
    })
  } catch (error) {
    console.error('Guest service details error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
