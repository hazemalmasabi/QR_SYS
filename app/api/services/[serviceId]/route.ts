import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { mainServiceSchema } from '@/lib/validations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { serviceId } = await params

    const { data: service, error } = await supabaseAdmin
      .from('main_services')
      .select('*')
      .eq('service_id', serviceId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (error || !service) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Service staff can only see their assigned service
    if (
      (session.role === 'service_supervisor' || session.role === 'service_employee') &&
      session.assignedServiceId &&
      service.service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Service GET error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
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

    const { serviceId } = await params
    const body = await request.json()
    const parsed = mainServiceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const now = new Date().toISOString()

    // Get total count and current display_order
    const { count } = await supabaseAdmin
      .from('main_services')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    const totalCount = count || 1

    const { data: current } = await supabaseAdmin
      .from('main_services')
      .select('display_order')
      .eq('service_id', serviceId)
      .single()

    const oldOrder = current?.display_order || 1
    let newOrder = data.displayOrder

    // Clamp: cannot exceed total count and minimum is 1
    if (newOrder > totalCount) newOrder = totalCount
    if (newOrder < 1) newOrder = 1

    // If only 1 item, force order to 1
    if (totalCount === 1) newOrder = 1

    // If display_order changed, shift others
    if (oldOrder !== newOrder) {
      if (newOrder < oldOrder) {
        // Moving UP (e.g., 5 → 2): shift items between newOrder and oldOrder-1 up by +1
        const { data: toShift } = await supabaseAdmin
          .from('main_services')
          .select('service_id, display_order')
          .eq('hotel_id', session.hotelId)
          .is('deleted_at', null)
          .neq('service_id', serviceId)
          .gte('display_order', newOrder)
          .lte('display_order', oldOrder - 1)
          .order('display_order', { ascending: false })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('main_services')
              .update({ display_order: item.display_order + 1 })
              .eq('service_id', item.service_id)
          }
        }
      } else {
        // Moving DOWN (e.g., 2 → 5): shift items between oldOrder+1 and newOrder down by -1
        const { data: toShift } = await supabaseAdmin
          .from('main_services')
          .select('service_id, display_order')
          .eq('hotel_id', session.hotelId)
          .is('deleted_at', null)
          .neq('service_id', serviceId)
          .gte('display_order', oldOrder + 1)
          .lte('display_order', newOrder)
          .order('display_order', { ascending: true })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('main_services')
              .update({ display_order: item.display_order - 1 })
              .eq('service_id', item.service_id)
          }
        }
      }
    }

    data.displayOrder = newOrder

    const updateData = {
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
      updated_at: now,
    }

    const { data: service, error } = await supabaseAdmin
      .from('main_services')
      .update(updateData)
      .eq('service_id', serviceId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error || !service) {
      console.error('Service update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Service PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
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

    const { serviceId } = await params
    const now = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('main_services')
      .update({ deleted_at: now, updated_at: now })
      .eq('service_id', serviceId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    if (error) {
      console.error('Service delete error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Service DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> }
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

    const { serviceId } = await params

    // Fetch current status
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('main_services')
      .select('status')
      .eq('service_id', serviceId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    const newStatus = current.status === 'active' ? 'inactive' : 'active'
    const now = new Date().toISOString()

    const { data: service, error } = await supabaseAdmin
      .from('main_services')
      .update({ status: newStatus, updated_at: now })
      .eq('service_id', serviceId)
      .eq('hotel_id', session.hotelId)
      .select()
      .single()

    if (error) {
      console.error('Service toggle error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Service PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
