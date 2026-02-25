import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { itemSchema } from '@/lib/validations'

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
    const subServiceId = searchParams.get('sub_service_id')
    const serviceId = searchParams.get('service_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('items')
      .select('*, sub_services!inner(sub_service_id, sub_service_name, parent_service_id, display_order, main_services!inner(service_id, service_name, hotel_id, display_order))', { count: 'exact' })
      .eq('sub_services.main_services.hotel_id', session.hotelId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    // Service staff can only see items of their assigned service
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId
    ) {
      query = query.eq('sub_services.main_services.service_id', session.assignedServiceId)
    }

    if (subServiceId) {
      query = query.eq('sub_service_id', subServiceId)
    }

    if (serviceId) {
      query = query.eq('sub_services.parent_service_id', serviceId)
    }

    // Apply pagination range if limit is greater than 0
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Items fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: items || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Items API error:', error)
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

    // Get current count of items under this sub-service
    const { count } = await supabaseAdmin
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('sub_service_id', body.subServiceId)
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

    const parsed = itemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Verify the sub-service belongs to a service in this hotel
    const { data: subService, error: subError } = await supabaseAdmin
      .from('sub_services')
      .select('*, main_services!inner(hotel_id, service_id)')
      .eq('sub_service_id', data.subServiceId)
      .eq('main_services.hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (subError || !subService) {
      return NextResponse.json(
        { success: false, message: 'invalidSubService' },
        { status: 400 }
      )
    }

    // Service supervisor can only add to their assigned service
    if (
      session.role === 'service_supervisor' &&
      session.assignedServiceId &&
      subService.parent_service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Shift existing items at or after this display_order
    if (data.displayOrder <= totalCount) {
      const { data: toShift } = await supabaseAdmin
        .from('items')
        .select('item_id, display_order')
        .eq('sub_service_id', data.subServiceId)
        .is('deleted_at', null)
        .gte('display_order', data.displayOrder)
        .order('display_order', { ascending: false })

      if (toShift) {
        for (const item of toShift) {
          await supabaseAdmin
            .from('items')
            .update({ display_order: item.display_order + 1 })
            .eq('item_id', item.item_id)
        }
      }
    }

    const now = new Date().toISOString()

    const insertData = {
      sub_service_id: data.subServiceId,
      item_name: { ar: data.itemNameAr, en: data.itemNameEn },
      description: {
        ar: data.descriptionAr || '',
        en: data.descriptionEn || '',
      },
      image_url: body.imageUrl || null,
      price: data.isFree ? 0 : data.price,
      is_free: data.isFree || false,
      display_order: data.displayOrder,
      availability_status: 'available',
      created_at: now,
      updated_at: now,
    }

    const { data: item, error } = await supabaseAdmin
      .from('items')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Item create error:', error)
      return NextResponse.json(
        { success: false, message: 'createError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, item }, { status: 201 })
  } catch (error) {
    console.error('Items POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
