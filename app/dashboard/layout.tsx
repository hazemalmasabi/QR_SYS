import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import GlobalOrderNotifications from '@/components/dashboard/GlobalOrderNotifications'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: hotel } = await supabaseAdmin
    .from('hotels')
    .select('hotel_name, hotel_name_en, hotel_logo_url, currency_code, currency_symbol')
    .eq('hotel_id', session.hotelId)
    .single()

  const hotelData = {
    hotel_name: hotel?.hotel_name || 'QR SYS',
    hotel_name_en: hotel?.hotel_name_en || '',
    hotel_logo_url: hotel?.hotel_logo_url || '',
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <GlobalOrderNotifications hotelId={session.hotelId} />
      <Sidebar session={session} hotel={hotelData} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar session={session} hotelName={hotelData.hotel_name} hotelNameEn={hotelData.hotel_name_en} />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
