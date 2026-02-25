import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { data: hotels, error } = await supabaseAdmin
      .from('hotels')
      .select('hotel_id, hotel_name, room_types')
      .eq('status', 'active')
      .order('hotel_name', { ascending: true })

    if (error) {
      console.error('Hotels fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchFailed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, hotels: hotels || [] })
  } catch (error) {
    console.error('Hotels list error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
