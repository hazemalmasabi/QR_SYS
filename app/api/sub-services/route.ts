import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { subServiceSchema } from '@/lib/validations'

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
    const parentServiceId = searchParams.get('parent_service_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const missingTranslationLang = searchParams.get('missing_translation_lang')
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('sub_services')
      .select('*, main_services!inner(service_id, service_name, hotel_id, display_order)', { count: 'exact' })
      .eq('main_services.hotel_id', session.hotelId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    // Service staff can only see sub-services of their assigned service
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      query = query.eq('parent_service_id', session.assignedServiceId)
    }

    if (parentServiceId) {
      query = query.eq('parent_service_id', parentServiceId)
    }

    if (missingTranslationLang) {
      query = query.or(`sub_service_name->>${missingTranslationLang}.is.null,sub_service_name->>${missingTranslationLang}.eq.""`)
    }

    // Apply pagination range if limit is greater than 0
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: subServices, error, count } = await query

    if (error) {
      console.error('Sub-services fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subServices: subServices || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Sub-services API error:', error)
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

    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Get current count of sub-services under this parent
    const { count } = await supabaseAdmin
      .from('sub_services')
      .select('*', { count: 'exact', head: true })
      .eq('parent_service_id', body.parentServiceId)
      .is('deleted_at', null)

    const totalCount = count || 0
    const nextOrder = totalCount + 1

    // Auto-set display_order to next available if not provided or invalid
    if (!body.displayOrder || body.displayOrder < 1) {
      body.displayOrder = nextOrder
    }

    // Clamp display_order: cannot exceed totalCount + 1
    if (body.displayOrder > nextOrder) {
      body.displayOrder = nextOrder
    }

    const parsed = subServiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify the parent service belongs to this hotel
    const { data: parentService, error: parentError } = await supabaseAdmin
      .from('main_services')
      .select('service_id')
      .eq('service_id', data.parentServiceId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (parentError || !parentService) {
      return NextResponse.json(
        { success: false, message: 'invalidParentService' },
        { status: 400 }
      )
    }

    // Service supervisor can only add to their assigned service
    if (
      session.role === 'service_supervisor' &&
      session.assignedServiceId &&
      data.parentServiceId !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Shift existing sub-services at or after this display_order
    if (data.displayOrder <= totalCount) {
      const { data: toShift } = await supabaseAdmin
        .from('sub_services')
        .select('sub_service_id, display_order')
        .eq('parent_service_id', data.parentServiceId)
        .is('deleted_at', null)
        .gte('display_order', data.displayOrder)
        .order('display_order', { ascending: false })

      if (toShift) {
        for (const item of toShift) {
          await supabaseAdmin
            .from('sub_services')
            .update({ display_order: item.display_order + 1 })
            .eq('sub_service_id', item.sub_service_id)
        }
      }
    }

    const now = new Date().toISOString()

    const insertData = {
      parent_service_id: data.parentServiceId,
      sub_service_name: body.subServiceName || { en: data.subServiceNameEn, ar: data.subServiceNameSecondary },
      description: body.description || (data.descriptionEn || data.descriptionSecondary
        ? { en: data.descriptionEn || '', ar: data.descriptionSecondary || '' }
        : null),
      image_url: body.imageUrl || null,
      availability_type: data.availabilityType,
      start_time: data.availabilityType === 'scheduled' ? data.startTime || null : null,
      end_time: data.availabilityType === 'scheduled' ? data.endTime || null : null,
      display_order: data.displayOrder,
      status: 'active',
      created_at: now,
      updated_at: now,
    }

    const { data: subService, error } = await supabaseAdmin
      .from('sub_services')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Sub-service create error:', error)
      return NextResponse.json(
        { success: false, message: 'createError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, subService }, { status: 201 })
  } catch (error) {
    console.error('Sub-services POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
