'use client'

import { Menu } from 'lucide-react'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import type { SessionPayload } from '@/types'

interface TopBarProps {
  session: SessionPayload
  hotelName: string
  hotelNameTranslations?: Record<string, string>
}

export default function TopBar({ session, hotelName, hotelNameTranslations }: TopBarProps) {
  const { toggle } = useSidebarStore()

  return (
    <header className="sticky top-0 z-30 flex items-center border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur-sm md:hidden">
      <button
        onClick={toggle}
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  )
}
