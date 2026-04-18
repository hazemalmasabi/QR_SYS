import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function DELETE() {
  try {
    const session = await getSession()
    
    // Only Primary Supervisor can delete all rooms
    if (!session || !session.isPrimarySupervisor) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    // Soft delete all active/inactive rooms for this hotel
    const { error } = await supabaseAdmin
      .from('rooms')
      .update({ deleted_at: now, status: 'inactive' })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    if (error) {
      console.error('Delete all rooms error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Rooms delete-all API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
