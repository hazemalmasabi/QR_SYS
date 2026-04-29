'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ConciergeBell, HandPlatter, ClipboardList, Hotel } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Clock } from '@/components/Clock'

interface GuestInfo {
  hasActiveSession: boolean
  room: { room_id: string; room_number: string; room_type: string }
  hotel: {
    hotel_id: string
    hotel_name: string
    hotel_logo_url: string
    timezone: string
    currency_code: string
    currency_symbol: string
    language_secondary: string
    hotel_name_translations: Record<string, string>
    location_verification_enabled: boolean
    hotel_google_maps_url: string | null
  }
}

export default function GuestLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ qrCode: string }>
}) {
  const { qrCode } = use(params)
  const t = useTranslations('guest')
  const locale = useLocale()
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
    fetch(`/api/guest/${qrCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGuestInfo(data)
        }
      })
      .catch(console.error)
  }, [qrCode])

  const navItems = [
    {
      href: `/guest/${qrCode}`,
      label: t('services'),
      icon: ConciergeBell,
      isActive: pathname === `/guest/${qrCode}`,
    },
    {
      href: `/guest/${qrCode}/cart`,
      label: t('cart'),
      icon: HandPlatter,
      isActive: pathname === `/guest/${qrCode}/cart`,
      badge: isHydrated && itemCount > 0 ? itemCount : undefined,
    },
    {
      href: `/guest/${qrCode}/orders`,
      label: t('myOrders'),
      icon: ClipboardList,
      isActive: pathname === `/guest/${qrCode}/orders`,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white overflow-hidden">
              {guestInfo?.hotel.hotel_logo_url ? (
                <Image
                  src={guestInfo.hotel.hotel_logo_url}
                  alt={guestInfo.hotel.hotel_name}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <Hotel className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                {guestInfo
                  ? (guestInfo.hotel.hotel_name_translations?.[locale] ||
                    guestInfo.hotel.hotel_name_translations?.en ||
                    guestInfo.hotel.hotel_name)
                  : '...'}
              </h1>
              <p className="text-xs text-gray-500">
                {t('room')}: {guestInfo?.room.room_number || '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {guestInfo ? (
              <>
                <Clock timezone={guestInfo.hotel.timezone} />
                <LanguageSwitcher
                  className="!py-1.5 !px-2.5 !text-xs"
                  secondaryLocale={guestInfo.hotel.language_secondary}
                />
              </>
            ) : (
              <>
                <div className="h-8 w-12 animate-pulse rounded-lg bg-gray-200" />
                <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        {children}
      </main>

      {/* Bottom Navigation — only if session is active */}
      {guestInfo?.hasActiveSession && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm safe-area-bottom">
          <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors',
                    item.isActive
                      ? 'text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge && (
                      <span className="absolute -end-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span>{item.label}</span>
                  {item.isActive && (
                    <span className="absolute -bottom-2 h-0.5 w-6 rounded-full bg-primary-600" />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
