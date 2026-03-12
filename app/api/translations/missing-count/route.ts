import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
    const session = await getSession()
    if (!session || !session.hotelId) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 1. Get the hotel's secondary language
        const { data: hotelData } = await supabaseAdmin
            .from('hotels')
            .select('language_secondary, room_types')
            .eq('hotel_id', session.hotelId)
            .single()

        const secondaryLang = hotelData?.language_secondary || 'none'

        // Default counts
        const counts = {
            services: 0,
            subServices: 0,
            items: 0,
            roomTypes: 0
        }

        if (secondaryLang !== 'none') {
            // 2. Count Services missing translations
            const { data: servicesData } = await supabaseAdmin
                .from('main_services')
                .select('service_name')
                .eq('hotel_id', session.hotelId)
                .is('deleted_at', null)

            counts.services = (servicesData || []).filter(s => !s.service_name?.[secondaryLang]?.trim()).length

            // 3. Count Sub-Services missing translations
            const { data: subServicesData } = await supabaseAdmin
                .from('sub_services')
                .select('sub_service_name, main_services!inner(hotel_id)')
                .eq('main_services.hotel_id', session.hotelId)
                .is('deleted_at', null)

            counts.subServices = (subServicesData || []).filter(ss => !ss.sub_service_name?.[secondaryLang]?.trim()).length

            // 4. Count Items missing translations
            const { data: itemsData } = await supabaseAdmin
                .from('items')
                .select('item_name, sub_services!inner(main_services!inner(hotel_id))')
                .eq('sub_services.main_services.hotel_id', session.hotelId)
                .is('deleted_at', null)

            counts.items = (itemsData || []).filter(item => !item.item_name?.[secondaryLang]?.trim()).length

            // 5. Count Room Types missing translations
            const roomTypes = hotelData?.room_types || []
            counts.roomTypes = roomTypes.filter((rt: any) => !rt.name?.[secondaryLang]?.trim()).length
        }

        return NextResponse.json({ success: true, counts })
    } catch (error) {
        console.error('Error fetching missing translation counts:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
    }
}
