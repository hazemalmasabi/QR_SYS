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
  LogOut,
  Shield,
  AlertTriangle,
  HelpCircle,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslationCounts } from '@/components/Providers/TranslationProvider'
import type { SessionPayload } from '@/types'

interface NavItem {
  key: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'rooms', href: '/dashboard/rooms', icon: BedDouble },
  { key: 'orders', href: '/dashboard/orders', icon: ClipboardList },
  { key: 'payments', href: '/dashboard/payments', icon: CreditCard },
  { key: 'services', href: '/dashboard/services', icon: Layers },
  { key: 'subServices', href: '/dashboard/sub-services', icon: ListTree },
  { key: 'items', href: '/dashboard/items', icon: Package },
  { key: 'employees', href: '/dashboard/employees', icon: Users },
  { key: 'reports', href: '/dashboard/reports', icon: BarChart3 },
  { key: 'settings', href: '/dashboard/settings', icon: Settings },
  { key: 'help', href: '/dashboard/help', icon: HelpCircle },
]

const ROLE_NAV_KEYS: Record<SessionPayload['role'], string[]> = {
  hotel_supervisor: [
    'dashboard',
    'rooms',
    'orders',
    'payments',
    'services',
    'subServices',
    'items',
    'employees',
    'reports',
    'settings',
    'help',
  ],
  service_supervisor: [
    'dashboard',
    'orders',
    'payments',
    'subServices',
    'items',
    'employees',
    'reports',
    'help',
  ],
  service_employee: ['dashboard', 'orders', 'payments', 'help'],
}

interface SidebarProps {
  session: SessionPayload
  hotel: {
    hotel_name: string
    hotel_name_translations?: Record<string, string>
    hotel_logo_url: string
    language_secondary: string
  }
}

export default function Sidebar({ session, hotel }: SidebarProps) {
  const t = useTranslations('sidebar')
  const tc = useTranslations('common')
  // const te = useTranslations('employees')
  // const td = useTranslations('dashboard')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { isOpen, close, toggle } = useSidebarStore()
  const { counts } = useTranslationCounts()

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

  const displayHotelName =
    hotel.hotel_name_translations?.[locale] || hotel.hotel_name_translations?.en || hotel.hotel_name

  // Role label
  const roleLabel = session.isPrimarySupervisor
    ? t('primarySupervisor')
    : session.role === 'hotel_supervisor'
      ? t('hotelSupervisor')
      : (session.role === 'service_supervisor'
        ? t('serviceSupervisor')
        : t('serviceEmployee'))

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
            aria-label={tc('expandSidebar')}
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
                {t('welcome')}{locale === 'ar' ? '،' : ','}{' '}
                <span className="font-medium text-gray-800">{session.fullName}</span>
              </p>
              <div className="mt-1 flex items-center justify-center gap-1">
                {session.isPrimarySupervisor && (
                  <Shield className="h-3 w-3 text-amber-500" />
                )}
                <span className="text-xs font-medium text-primary-600">
                  {roleLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation - removed overflow-y-auto to prevent tooltip clipping */}
        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              // Determine if this nav item needs a translation warning badge
              let hasWarning = false
              if (hotel.language_secondary && hotel.language_secondary !== 'none') {
                if (item.key === 'services' && counts.services > 0) hasWarning = true
                if (item.key === 'subServices' && counts.subServices > 0) hasWarning = true
                if (item.key === 'items' && counts.items > 0) hasWarning = true
                if (item.key === 'settings' && counts.roomTypes > 0) hasWarning = true
              }

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
                    {isOpen && <span className="flex-1 text-start">{t(item.key)}</span>}
                    {hasWarning && (
                      <div className="group/tooltip relative flex items-center shrink-0">
                        {isOpen ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-yellow-500 cursor-help" />
                            <div className={cn(
                              "absolute top-1/2 -translate-y-1/2 hidden w-[250px] rounded bg-gray-900 px-3 py-2 text-center text-[10px] text-white opacity-0 transition-opacity group-hover/tooltip:block group-hover/tooltip:opacity-100 z-[100] pointer-events-none shadow-lg font-normal leading-tight whitespace-normal",
                              locale === 'ar' ? "end-full me-2" : "start-full ms-2"
                            )}>
                              {tc('missingTranslationTooltip', { language: tc(`language_${hotel.language_secondary}` as any) })}
                              {/* Arrow */}
                              <div className={cn(
                                "absolute top-1/2 -mt-1 border-4 border-transparent",
                                locale === 'ar' ? "start-full border-s-gray-900" : "end-full border-e-gray-900"
                              )}></div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="absolute -top-1 -end-1 h-2 w-2 rounded-full bg-yellow-500 border border-white" />
                            <div className="absolute start-full ms-2 top-1/2 -translate-y-1/2 hidden w-[150px] rounded bg-gray-900 px-2 py-1.5 text-center text-[10px] text-white opacity-0 transition-opacity group-hover/tooltip:block group-hover/tooltip:opacity-100 z-50 pointer-events-none shadow-lg font-normal leading-tight">
                              {tc('missingTranslationTooltip', { language: tc(`language_${hotel.language_secondary}` as any) })}
                              <div className={cn(
                                "absolute top-1/2 -mt-1 border-4 border-transparent",
                                locale === 'ar' ? "start-full border-s-gray-900" : "end-full border-e-gray-900"
                              )}></div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
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
                <LanguageSwitcher compact={false} secondaryLocale={hotel.language_secondary} />
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
              <LanguageSwitcher compact={true} secondaryLocale={hotel.language_secondary} />
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
