import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { itemSchema } from '@/lib/validations'

async function verifyItemAccess(
  itemId: string,
  hotelId: string,
  assignedServiceId: string | null,
  role: string
) {
  const { data: item, error } = await supabaseAdmin
    .from('items')
    .select('*, sub_services!inner(sub_service_id, parent_service_id, main_services!inner(hotel_id, service_id))')
    .eq('item_id', itemId)
    .eq('sub_services.main_services.hotel_id', hotelId)
    .is('deleted_at', null)
    .single()

  if (error || !item) return null

  if (
    (role === 'service_supervisor' || role === 'service_employee') &&
    assignedServiceId &&
    item.sub_services.parent_service_id !== assignedServiceId
  ) {
    return null
  }

  return item
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { itemId } = await params
    const item = await verifyItemAccess(
      itemId,
      session.hotelId,
      session.assignedServiceId,
      session.role
    )

    if (!item) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Item GET error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
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

    const { itemId } = await params
    const existing = await verifyItemAccess(
      itemId,
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
    const parsed = itemSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'validationError', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const now = new Date().toISOString()

    // Get total count of sibling items
    const { count } = await supabaseAdmin
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('sub_service_id', data.subServiceId)
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
          .from('items')
          .select('item_id, display_order')
          .eq('sub_service_id', data.subServiceId)
          .is('deleted_at', null)
          .neq('item_id', itemId)
          .gte('display_order', newOrder)
          .lte('display_order', oldOrder - 1)
          .order('display_order', { ascending: false })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('items')
              .update({ display_order: item.display_order + 1 })
              .eq('item_id', item.item_id)
          }
        }
      } else {
        // Moving DOWN: shift items between oldOrder+1 and newOrder down by -1
        const { data: toShift } = await supabaseAdmin
          .from('items')
          .select('item_id, display_order')
          .eq('sub_service_id', data.subServiceId)
          .is('deleted_at', null)
          .neq('item_id', itemId)
          .gte('display_order', oldOrder + 1)
          .lte('display_order', newOrder)
          .order('display_order', { ascending: true })

        if (toShift) {
          for (const item of toShift) {
            await supabaseAdmin
              .from('items')
              .update({ display_order: item.display_order - 1 })
              .eq('item_id', item.item_id)
          }
        }
      }
    }

    data.displayOrder = newOrder

    const updateData = {
      sub_service_id: data.subServiceId,
      item_name: body.itemName || { en: data.itemNameEn, ar: data.itemNameSecondary },
      description: body.description || {
        en: data.descriptionEn || '',
        ar: data.descriptionSecondary || '',
      },
      image_url: body.imageUrl || null,
      price: data.isFree ? 0 : data.price,
      is_free: data.isFree || false,
      display_order: data.displayOrder,
      updated_at: now,
    }

    const { data: item, error } = await supabaseAdmin
      .from('items')
      .update(updateData)
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error || !item) {
      console.error('Item update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Item PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
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

    const { itemId } = await params
    const existing = await verifyItemAccess(
      itemId,
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
      .from('items')
      .update({ deleted_at: now, updated_at: now })
      .eq('item_id', itemId)
      .is('deleted_at', null)

    if (error) {
      console.error('Item delete error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Item DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
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

    const { itemId } = await params
    const existing = await verifyItemAccess(
      itemId,
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

    const newStatus = existing.availability_status === 'available' ? 'unavailable' : 'available'
    const now = new Date().toISOString()

    const { data: item, error } = await supabaseAdmin
      .from('items')
      .update({ availability_status: newStatus, updated_at: now })
      .eq('item_id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Item toggle error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, item })
  } catch (error) {
    console.error('Item PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
