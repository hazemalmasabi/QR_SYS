import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    const { roomId } = await params

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (error || !room) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Room detail error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params
    const body = await request.json()
    const { room_number, floor_number, room_type, notes, status } = body

    // Check room exists
    const { data: existing } = await supabaseAdmin
      .from('rooms')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Check for duplicate room number (excluding current room)
    if (room_number) {
      const { data: duplicate } = await supabaseAdmin
        .from('rooms')
        .select('room_id')
        .eq('hotel_id', session.hotelId)
        .eq('room_number', room_number)
        .is('deleted_at', null)
        .neq('room_id', roomId)
        .maybeSingle()

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'duplicateRoom' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (room_number !== undefined) updateData.room_number = room_number
    if (floor_number !== undefined) updateData.floor_number = floor_number || null
    if (room_type !== undefined) updateData.room_type = room_type
    if (notes !== undefined) updateData.notes = notes || null
    if (status !== undefined) updateData.status = status

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .update(updateData)
      .eq('room_id', roomId)
      .select()
      .single()

    if (error) {
      console.error('Room update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, room })
  } catch (error) {
    console.error('Room PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
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

    const { roomId } = await params

    // Soft delete
    const { error } = await supabaseAdmin
      .from('rooms')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)

    if (error) {
      console.error('Room delete error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    // Deactivate QR mappings for this room
    await supabaseAdmin
      .from('room_qr_mappings')
      .update({ is_active: false })
      .eq('room_id', roomId)
      .eq('hotel_id', session.hotelId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Room DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
