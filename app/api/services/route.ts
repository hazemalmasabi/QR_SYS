import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { mainServiceSchema } from '@/lib/validations'

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
    const serviceId = searchParams.get('service_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('main_services')
      .select('*', { count: 'exact' })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    // Service staff can only see their assigned service
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      query = query.eq('service_id', session.assignedServiceId)
    }

    // Optional filter by specific service_id
    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    // Apply pagination range if limit is greater than 0
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: services, error, count } = await query

    if (error) {
      console.error('Services fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      services: services || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Services API error:', error)
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

    // Only hotel_supervisor can create services
    if (session.role !== 'hotel_supervisor') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Get current count of services
    const { count } = await supabaseAdmin
      .from('main_services')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    const totalCount = count || 0
    const nextOrder = totalCount + 1

    // Auto-set display_order to next available if not provided or invalid
    if (!body.displayOrder || body.displayOrder < 1) {
      body.displayOrder = nextOrder
    }

    // Clamp display_order: cannot exceed totalCount + 1 (new item max)
    if (body.displayOrder > nextOrder) {
      body.displayOrder = nextOrder
    }

    const parsed = mainServiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const now = new Date().toISOString()

    // Shift existing items at or after this display_order UP by 1
    if (data.displayOrder <= totalCount) {
      const { data: toShift } = await supabaseAdmin
        .from('main_services')
        .select('service_id, display_order')
        .eq('hotel_id', session.hotelId)
        .is('deleted_at', null)
        .gte('display_order', data.displayOrder)
        .order('display_order', { ascending: false })

      if (toShift) {
        for (const item of toShift) {
          await supabaseAdmin
            .from('main_services')
            .update({ display_order: item.display_order + 1 })
            .eq('service_id', item.service_id)
        }
      }
    }

    const insertData = {
      hotel_id: session.hotelId,
      service_name: { ar: data.serviceNameAr, en: data.serviceNameEn },
      description: {
        ar: data.descriptionAr || '',
        en: data.descriptionEn || '',
      },
      image_url: body.imageUrl || null,
      availability_type: data.availabilityType,
      start_time: data.availabilityType === 'scheduled' ? data.startTime || null : null,
      end_time: data.availabilityType === 'scheduled' ? data.endTime || null : null,
      display_order: data.displayOrder,
      status: 'active',
      created_at: now,
      updated_at: now,
    }

    const { data: service, error } = await supabaseAdmin
      .from('main_services')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Service create error:', error)
      return NextResponse.json(
        { success: false, message: 'createError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, service }, { status: 201 })
  } catch (error) {
    console.error('Services POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
