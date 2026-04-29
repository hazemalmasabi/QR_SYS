import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await context.params
    const roomId = params.roomId

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

    const body = await request.json()
    const { guestName } = body

    // Close any previous active sessions for this room just in case
    await supabaseAdmin
      .from('guest_sessions')
      .update({ status: 'checked_out', check_out_time: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('status', 'active')

    // Create a new active session
    const { data: guestSession, error } = await supabaseAdmin
      .from('guest_sessions')
      .insert({
        hotel_id: session.hotelId,
        room_id: roomId,
        status: 'active',
        guest_name: guestName || null,
        check_in_time: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Checkin error:', error)
      return NextResponse.json(
        { success: false, message: 'databaseError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, guestSession })
  } catch (error) {
    console.error('Checkin API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
