'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Minus, Plus, HandPlatter, Loader2, ChevronDown, Clock, Lock, Package } from 'lucide-react'
import { cn, formatCurrency, isWithinServiceHours } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Item, SubService } from '@/types'

interface SubServiceWithItems extends Omit<SubService, 'availability_type' | 'start_time' | 'end_time'> {
  items: Item[]
  availability_type?: string
  start_time?: string
  end_time?: string
}

interface ServiceInfo {
  service_id: string
  service_name: Record<string, string>
  description: Record<string, string>
  image_url: string | null
  availability_type?: string
  start_time?: string
  end_time?: string
  display_order?: number
}

export default function ServiceMenuPage({
  params,
}: {
  params: Promise<{ qrCode: string; serviceId: string }>
}) {
  const { qrCode, serviceId } = use(params)
  const t = useTranslations('guest')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const router = useRouter()

  const { items: cartItems, addItem, updateQuantity, getTotal, getItemCount } = useCartStore()

  const [service, setService] = useState<ServiceInfo | null>(null)
  const [subServices, setSubServices] = useState<SubServiceWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [timezone, setTimezone] = useState('Asia/Riyadh')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // State for expanding long descriptions (only one at a time)
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null)
  const [guestInfo, setGuestInfo] = useState<{ hotel: { currency_symbol: string } } | null>(null)

  useEffect(() => {
    // Fetch hotel info for currency symbol
    fetch(`/api/guest/${qrCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGuestInfo(data)
        } else if (data.message === 'noActiveSession') {
          router.push(`/guest/${qrCode}`)
        }
      })
      .catch(console.error)

    const fetchService = async () => {
      try {
        const res = await fetch(`/api/guest/${qrCode}/services/${serviceId}`)
        const data = await res.json()
        if (data.success) {
          setService(data.service)
          setSubServices(data.subServices)
          if (data.timezone) setTimezone(data.timezone)
          // Expand all sections by default
          setExpandedSections(new Set(data.subServices.map((s: SubServiceWithItems) => s.sub_service_id)))
        } else if (data.message === 'noActiveSession') {
          router.push(`/guest/${qrCode}`)
        }
      } catch (err) {
        console.error('Failed to fetch service:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [qrCode, serviceId, router])

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle expanding/collapsing descriptions (closing others)
  const toggleDesc = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedDescId(prev => prev === id ? null : id)
  }

  const handleAddItem = (item: Item) => {
    if (service) {
      addItem(item, service.service_id, service.service_name, service.display_order)
    } else {
      addItem(item)
    }
    // Close description if open
    if (expandedDescId === item.item_id) {
      setExpandedDescId(null)
    }
  }

  const getCartQuantity = (itemId: string) => {
    return cartItems.find((ci) => ci.item.item_id === itemId)?.quantity || 0
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">{t('serviceNotFound')}</p>
      </div>
    )
  }

  const serviceName = service.service_name[locale] || service.service_name.en || service.service_name.ar || ''
  const serviceDesc = service.description[locale] || service.description.en || service.description.ar || ''
  const itemCount = getItemCount()
  const total = getTotal()
  const currencySymbol = guestInfo?.hotel.currency_symbol || ''

  // Determine if the main service is open
  const isMainScheduled = service.availability_type === 'scheduled' && service.start_time && service.end_time
  const isMainOpen = !isMainScheduled || isWithinServiceHours(service.start_time!, service.end_time!, timezone)

  const formatTime = (time: string) => time.slice(0, 5) // Convert HH:MM:SS to HH:MM

  const isMainDescExpanded = expandedDescId === service.service_id
  const shouldTruncateMainDesc = serviceDesc && serviceDesc.length > 80

  return (
    <div className="space-y-4 pb-4">
      {/* Back + Service Header */}
      <div className="flex items-start gap-3">
        <Link
          href={`/guest/${qrCode}`}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
        >
          <BackArrow className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{serviceName}</h2>
            {!isMainOpen && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <Lock className="h-2.5 w-2.5" />
                {t('closed')}
              </span>
            )}
          </div>
          {serviceDesc && (
            <div className="mt-1">
              <p className={`text-sm text-gray-500 ${!isMainDescExpanded && shouldTruncateMainDesc ? 'line-clamp-2' : ''}`}>
                {serviceDesc}
              </p>
              {shouldTruncateMainDesc && (
                <button
                  onClick={(e) => toggleDesc(service.service_id, e)}
                  className="mt-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {isMainDescExpanded ? t('showLess') : t('readMore')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-2">
          <div className="mx-auto max-w-lg">
            <Link
              href={`/guest/${qrCode}/cart`}
              className="flex w-full items-center justify-between rounded-2xl bg-primary-600 px-5 py-3.5 text-white shadow-lg shadow-primary-600/30 transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <HandPlatter className="h-5 w-5" />
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary-600">
                    {itemCount}
                  </span>
                </div>
                <span className="font-medium">{t('viewCart')}</span>
              </div>
              <span className="font-bold">{formatCurrency(total, '', currencySymbol)}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Sub-services with items */}
      {subServices.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">{t('noItems')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...subServices]
            .sort((a, b) => {
              const aIsScheduled = a.availability_type === 'scheduled' && a.start_time && a.end_time
              const aIsOpen = isMainOpen && (!aIsScheduled || isWithinServiceHours(a.start_time!, a.end_time!, timezone))
              const bIsScheduled = b.availability_type === 'scheduled' && b.start_time && b.end_time
              const bIsOpen = isMainOpen && (!bIsScheduled || isWithinServiceHours(b.start_time!, b.end_time!, timezone))

              if (aIsOpen === bIsOpen) {
                return (a.display_order ?? 0) - (b.display_order ?? 0)
              }
              return aIsOpen ? -1 : 1
            })
            .map((sub) => {
              const subName = sub.sub_service_name[locale] || sub.sub_service_name.en || sub.sub_service_name.ar || ''
              const subDesc = sub.description ? (sub.description[locale] || sub.description.en || sub.description.ar || '') : null
              const isExpanded = expandedSections.has(sub.sub_service_id)

              // Sub-service description logic
              const isSubDescExpanded = expandedDescId === sub.sub_service_id
              const shouldTruncateSubDesc = subDesc && subDesc.length > 80

              // Check sub-service availability
              const subIsScheduled = sub.availability_type === 'scheduled' && sub.start_time && sub.end_time
              const subIsOpen = isMainOpen && (!subIsScheduled || isWithinServiceHours(sub.start_time!, sub.end_time!, timezone))

              return (
                <div
                  key={sub.sub_service_id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all ${!subIsOpen ? 'border-gray-200 bg-gray-50/50 grayscale-[20%]' : 'border-gray-100 hover:border-primary-100'
                    }`}
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleSection(sub.sub_service_id)}
                    className="flex w-full items-center justify-between p-4 px-5 text-left transition-colors hover:bg-gray-50"
                    disabled={!subIsOpen}
                  >
                    <div className="flex items-center gap-3">
                      {/* Sub-service Image */}
                      {sub.image_url && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-50">
                          <Image src={sub.image_url} alt={subName} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{subName}</span>
                          <span className="text-xs text-gray-400">({sub.items.length})</span>

                          {subIsOpen && !subIsScheduled && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{t('workingHours')}</span>
                              <span>{t('allDay')}</span>
                            </span>
                          )}
                          {subIsOpen && subIsScheduled && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{t('workingHours')}</span>
                              <span dir="ltr">{formatTime(sub.start_time!)}</span> - <span dir="ltr">{formatTime(sub.end_time!)}</span>
                            </span>
                          )}
                          {!subIsOpen && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              <Lock className="h-2.5 w-2.5" />
                              {t('closed')}
                            </span>
                          )}
                        </div>

                        {/* Sub-service Expandable Description */}
                        {subDesc && (
                          <div className="mt-0.5">
                            <p className={`text-xs text-gray-500 ${!isSubDescExpanded && shouldTruncateSubDesc ? 'line-clamp-2' : ''}`}>
                              {subDesc}
                            </p>
                            {shouldTruncateSubDesc && (
                              <div
                                onClick={(e) => toggleDesc(sub.sub_service_id, e)}
                                className="mt-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline inline-block"
                              >
                                {isSubDescExpanded
                                  ? t('showLess')
                                  : t('readMore')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn('h-5 w-5 shrink-0 text-gray-400 transition-transform ml-2', isExpanded && 'rotate-180')} />
                  </button>

                  {/* Closed warning banner */}
                  {!subIsOpen && isExpanded && (
                    <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">
                          {t('unavailable')}
                        </p>
                        {(() => {
                          const subIsClosedByTime = subIsScheduled && !isWithinServiceHours(sub.start_time!, sub.end_time!, timezone)
                          const mainIsClosedByTime = !isMainOpen && isMainScheduled

                          if (subIsClosedByTime) {
                            return (
                              <p className="mt-0.5 text-xs">
                                {t('workingHours')} {formatTime(sub.start_time!)} {t('to')} {formatTime(sub.end_time!)}
                              </p>
                            )
                          }
                          if (mainIsClosedByTime) {
                            return (
                              <p className="mt-0.5 text-xs">
                                {t('mainServiceAvailable')} {formatTime(service.start_time!)} {t('to')} {formatTime(service.end_time!)}
                              </p>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {sub.items.map((item, idx) => {
                        const itemName = item.item_name[locale] || item.item_name.en || item.item_name.ar || ''
                        const itemDesc = item.description ? (item.description[locale] || item.description.en || item.description.ar || '') : null
                        const qty = getCartQuantity(item.item_id)
                        const isItemAvailable = item.availability_status === 'available'

                        // Item description logic
                        const isItemDescExpanded = expandedDescId === item.item_id
                        const shouldTruncateItemDesc = itemDesc && itemDesc.length > 80

                        return (
                          <div key={item.item_id} className={cn('flex gap-3 p-4', idx > 0 && 'border-t border-gray-50')}>
                            {/* Item Image */}
                            <div className={cn("flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100", !isItemAvailable && "opacity-60 grayscale")}>
                              {item.image_url ? (
                                <Image src={item.image_url} alt={itemName} width={80} height={80} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-primary-50">
                                  <Package className="h-8 w-8 text-primary-300" />
                                </div>
                              )}
                            </div>

                            {/* Item Info */}
                            <div className={cn("flex flex-1 flex-col justify-between", !isItemAvailable && "opacity-70")}>
                              <div>
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-900">{itemName}</h4>
                                  {!isItemAvailable && (
                                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                      {t('outOfStock')}
                                    </span>
                                  )}
                                </div>

                                {/* Item Expandable Description */}
                                {itemDesc && (
                                  <div className="mt-0.5">
                                    <p className={`text-xs text-gray-500 ${!isItemDescExpanded && shouldTruncateItemDesc ? 'line-clamp-2' : ''}`}>
                                      {itemDesc}
                                    </p>
                                    {shouldTruncateItemDesc && (
                                      <button
                                        onClick={(e) => toggleDesc(item.item_id, e)}
                                        className="mt-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                                      >
                                        {isItemDescExpanded
                                          ? t('showLess')
                                          : t('readMore')}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm font-bold text-primary-600">
                                  {item.is_free
                                    ? t('free')
                                    : formatCurrency(item.price, '', currencySymbol)}
                                </span>

                                {/* Quantity Controls — disabled when closed or unavailable */}
                                {(!subIsOpen || !isItemAvailable) ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                                    <Lock className="h-3 w-3" />
                                    {t('unavailable')}
                                  </span>
                                ) : qty === 0 ? (
                                  <button
                                    onClick={() => handleAddItem(item)}
                                    className="btn-primary !py-1.5 !px-3 !text-xs !rounded-full"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    {t('addToCart')}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateQuantity(item.item_id, qty - 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-6 text-center text-sm font-bold">{qty}</span>
                                    <button
                                      onClick={() => updateQuantity(item.item_id, qty + 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

    </div>
  )
}
