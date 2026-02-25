'use client'

import { useTranslations, useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  ListTree,
  Package,
  BedDouble,
  Users,
  BarChart3,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { SessionPayload } from '@/types'

interface NavItem {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'orders', href: '/dashboard/orders', icon: ClipboardList },
  { key: 'services', href: '/dashboard/services', icon: Layers },
  { key: 'subServices', href: '/dashboard/sub-services', icon: ListTree },
  { key: 'items', href: '/dashboard/items', icon: Package },
  { key: 'rooms', href: '/dashboard/rooms', icon: BedDouble },
  { key: 'employees', href: '/dashboard/employees', icon: Users },
  { key: 'reports', href: '/dashboard/reports', icon: BarChart3 },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
]

const ROLE_NAV_KEYS: Record<SessionPayload['role'], string[]> = {
  hotel_supervisor: [
    'dashboard',
    'orders',
    'services',
    'subServices',
    'items',
    'rooms',
    'employees',
    'reports',
    'settings',
  ],
  service_supervisor: [
    'dashboard',
    'orders',
    'subServices',
    'items',
    'employees',
    'reports',
  ],
  service_employee: ['dashboard', 'orders'],
}

interface SidebarProps {
  session: SessionPayload
  hotel: {
    hotel_name: string
    hotel_name_en: string
    hotel_logo_url: string
  }
}

export default function Sidebar({ session, hotel }: SidebarProps) {
  const t = useTranslations('sidebar')
  const te = useTranslations('employees')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, close, toggle } = useSidebarStore()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const allowedKeys = ROLE_NAV_KEYS[session.role]
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!allowedKeys.includes(item.key)) return false
    // Settings is only visible to the primary supervisor
    if (item.key === 'settings' && !session.isPrimarySupervisor) return false
    return true
  })

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // Hotel name based on locale
  const displayHotelName =
    locale === 'en' && hotel.hotel_name_en ? hotel.hotel_name_en : hotel.hotel_name

  // Role label
  const roleLabel = session.isPrimarySupervisor
    ? (locale === 'ar' ? 'المشرف الرئيسي' : 'Primary Supervisor')
    : session.role === 'hotel_supervisor'
      ? te('hotelSupervisor')
      : session.role === 'service_supervisor'
        ? te('serviceSupervisor')
        : te('serviceEmployee')

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        onClick={close}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed start-0 top-0 z-50 flex h-full flex-col border-e border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out',
          'md:static md:z-auto md:shadow-none',
          isOpen
            ? 'w-56 translate-x-0'
            : locale === 'ar'
              ? 'w-14 translate-x-full md:translate-x-0'
              : 'w-14 -translate-x-full md:translate-x-0'
        )}
      >
        {/* When collapsed (desktop only): clicking anywhere on the sidebar opens it */}
        {!isOpen && (
          <button
            onClick={toggle}
            className="absolute inset-0 z-10 hidden md:flex flex-col items-center justify-center gap-3 w-full cursor-pointer"
            aria-label="Expand sidebar"
          />
        )}
        {/* Header: Logo + Hotel Name */}
        <div className="flex flex-col items-center border-b border-gray-200 px-3 py-4 gap-2">
          <div className="flex w-full items-center gap-3">
            {/* Logo / Icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-primary-600 text-white">
              {hotel.hotel_logo_url ? (
                <Image
                  src={hotel.hotel_logo_url}
                  alt={displayHotelName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base font-bold">
                  {displayHotelName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Hotel Name + System Name */}
            {isOpen && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-bold text-gray-900">{displayHotelName}</p>
                <p className="truncate text-xs text-gray-400">QR SYS</p>
              </div>
            )}

            {/* Close button on mobile */}
            {isOpen && (
              <button
                onClick={close}
                className="ms-auto shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Welcome greeting */}
          {isOpen && (
            <div className="w-full rounded-lg bg-gray-50 px-2 py-2 text-center" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <p className="text-xs text-gray-500">
                {locale === 'ar' ? 'مرحباً،' : 'Welcome,'}{' '}
                <span className="font-medium text-gray-800">{session.fullName}</span>
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                {session.isPrimarySupervisor && (
                  <Shield className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs font-medium text-primary-600">{roleLabel}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={close}
                    title={!isOpen ? t(item.key) : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors',
                      !isOpen && 'justify-center',
                      active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        active ? 'text-primary-600' : 'text-gray-400'
                      )}
                    />
                    {isOpen && <span>{t(item.key)}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer: Language + Logout side by side */}
        <div className="border-t border-gray-200 px-2 py-3">
          {isOpen ? (
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <LanguageSwitcher compact={false} />
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap"
                title={t('logout')}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-xs">{t('logout')}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <LanguageSwitcher compact={true} />
              <button
                onClick={handleLogout}
                className="flex items-center justify-center rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                title={t('logout')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  )
}
