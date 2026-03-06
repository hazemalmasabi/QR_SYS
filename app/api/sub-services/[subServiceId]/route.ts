import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { subServiceSchema } from '@/lib/validations'

async function verifySubServiceAccess(
  subServiceId: string,
  hotelId: string,
  assignedServiceId: string | null,
  role: string
) {
  const { data: subService, error } = await supabaseAdmin
    .from('sub_services')
    .select('*, main_services!inner(hotel_id)')
    .eq('sub_service_id', subServiceId)
    .eq('main_services.hotel_id', hotelId)
    .is('deleted_at', null)
    .single()

  if (error || !subService) return null

  // Service staff can only access sub-services of their assigned service
  if (
    (role === 'service_supervisor' || role === 'service_employee') &&
    assignedServiceId &&
    subService.parent_service_id !== assignedServiceId
  ) {
    return null
  }

  return subService
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { subServiceId } = await params
    const subService = await verifySubServiceAccess(
      subServiceId,
      session.hotelId,
      session.assignedServiceId,
      session.role
    )

    if (!subService) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, subService })
  } catch (error) {
    console.error('Sub-service GET error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
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

    const { subServiceId } = await params
    const existing = await verifySubServiceAccess(
      subServiceId,
      session.hotelId,
      session.assignedServiceId,
      session.role
    )

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = subServiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const now = new Date().toISOString()

    // Get total count of sibling sub-services
    const { count } = await supabaseAdmin
      .from('sub_services')
      .select('*', { count: 'exact', head: true })
      .eq('parent_service_id', data.parentServiceId)
      .is('deleted_at', null)

    const totalCount = count || 1

    const oldOrder = existing.display_order || 1
    let newOrder = data.displayOrder

    // Clamp: cannot exceed total count and minimum is 1
    if (newOrder > totalCount) newOrder = totalCount
    if (newOrder < 1) newOrder = 1
    if (totalCount === 1) newOrder = 1

    // If display_order changed, shift others
    if (oldOrder !== newOrder) {
      if (newOrder < oldOrder) {
        // Moving UP: shift items between newOrder and oldOrder-1 up by +1
        const { data: toShift } = await supabaseAdmin
          .from('sub_services')
          .select('sub_service_id, display_order')
          .eq('parent_service_id', data.parentServiceId)
          .is('deleted_at', null)
          .neq('sub_service_id', subServiceId)
          .gte('display_order', newOrder)
          .lte('display_order', oldOrder - 1)
          .order('display_order', { ascending: false })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('sub_services')
              .update({ display_order: item.display_order + 1 })
              .eq('sub_service_id', item.sub_service_id)
          }
        }
      } else {
        // Moving DOWN: shift items between oldOrder+1 and newOrder down by -1
        const { data: toShift } = await supabaseAdmin
          .from('sub_services')
          .select('sub_service_id, display_order')
          .eq('parent_service_id', data.parentServiceId)
          .is('deleted_at', null)
          .neq('sub_service_id', subServiceId)
          .gte('display_order', oldOrder + 1)
          .lte('display_order', newOrder)
          .order('display_order', { ascending: true })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('sub_services')
              .update({ display_order: item.display_order - 1 })
              .eq('sub_service_id', item.sub_service_id)
          }
        }
      }
    }

    data.displayOrder = newOrder

    const updateData = {
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
      updated_at: now,
    }

    const { data: subService, error } = await supabaseAdmin
      .from('sub_services')
      .update(updateData)
      .eq('sub_service_id', subServiceId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error || !subService) {
      console.error('Sub-service update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, subService })
  } catch (error) {
    console.error('Sub-service PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
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

    const { subServiceId } = await params
    const existing = await verifySubServiceAccess(
      subServiceId,
      session.hotelId,
      session.assignedServiceId,
      session.role
    )

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('sub_services')
      .update({ deleted_at: now, updated_at: now })
      .eq('sub_service_id', subServiceId)
      .is('deleted_at', null)

    if (error) {
      console.error('Sub-service delete error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sub-service DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ subServiceId: string }> }
) {
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

    const { subServiceId } = await params
    const existing = await verifySubServiceAccess(
      subServiceId,
      session.hotelId,
      session.assignedServiceId,
      session.role
    )

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    const newStatus = existing.status === 'active' ? 'inactive' : 'active'
    const now = new Date().toISOString()

    const { data: subService, error } = await supabaseAdmin
      .from('sub_services')
      .update({ status: newStatus, updated_at: now })
      .eq('sub_service_id', subServiceId)
      .select()
      .single()

    if (error) {
      console.error('Sub-service toggle error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, subService })
  } catch (error) {
    console.error('Sub-service PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
