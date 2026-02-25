'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { ArrowRight, ArrowLeft, Minus, Plus, ShoppingCart, Loader2, ChevronDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import type { Item, SubService } from '@/types'

interface SubServiceWithItems extends SubService {
  items: Item[]
}

interface ServiceInfo {
  service_id: string
  service_name: { ar: string; en: string }
  description: { ar: string; en: string }
  image_url: string | null
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

  const { items: cartItems, addItem, removeItem, updateQuantity, getTotal, getItemCount } = useCartStore()

  const [service, setService] = useState<ServiceInfo | null>(null)
  const [subServices, setSubServices] = useState<SubServiceWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await fetch(`/api/guest/${qrCode}/services/${serviceId}`)
        const data = await res.json()
        if (data.success) {
          setService(data.service)
          setSubServices(data.subServices)
          // Expand all sections by default
          setExpandedSections(new Set(data.subServices.map((s: SubServiceWithItems) => s.sub_service_id)))
        }
      } catch (err) {
        console.error('Failed to fetch service:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [qrCode, serviceId])

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

  const serviceName = locale === 'ar' ? service.service_name.ar : service.service_name.en
  const itemCount = getItemCount()
  const total = getTotal()

  return (
    <div className="space-y-4 pb-4">
      {/* Back + Service Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/guest/${qrCode}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
        >
          <BackArrow className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{serviceName}</h2>
          {service.description && (
            <p className="text-sm text-gray-500">
              {locale === 'ar' ? service.description.ar : service.description.en}
            </p>
          )}
        </div>
      </div>

      {/* Sub-services with items */}
      {subServices.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">{t('noItems')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subServices.map((sub) => {
            const subName = locale === 'ar' ? sub.sub_service_name.ar : sub.sub_service_name.en
            const isExpanded = expandedSections.has(sub.sub_service_id)

            return (
              <div key={sub.sub_service_id} className="card !p-0 overflow-hidden">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(sub.sub_service_id)}
                  className="flex w-full items-center justify-between p-4 text-start transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {sub.image_url && (
                      <div className="h-10 w-10 overflow-hidden rounded-lg">
                        <Image
                          src={sub.image_url}
                          alt={subName}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <span className="font-semibold text-gray-900">{subName}</span>
                    <span className="text-xs text-gray-400">({sub.items.length})</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 text-gray-400 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {/* Items */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {sub.items.map((item, idx) => {
                      const itemName = locale === 'ar' ? item.item_name.ar : item.item_name.en
                      const itemDesc = locale === 'ar' ? item.description.ar : item.description.en
                      const qty = getCartQuantity(item.item_id)

                      return (
                        <div
                          key={item.item_id}
                          className={cn(
                            'flex gap-3 p-4',
                            idx > 0 && 'border-t border-gray-50'
                          )}
                        >
                          {/* Item Image */}
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={itemName}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl">🍽️</span>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{itemName}</h4>
                              {itemDesc && (
                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                  {itemDesc}
                                </p>
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-bold text-primary-600">
                                {formatCurrency(item.price, '', '')} 
                              </span>

                              {/* Quantity Controls */}
                              {qty === 0 ? (
                                <button
                                  onClick={() => addItem(item)}
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
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary-600">
                    {itemCount}
                  </span>
                </div>
                <span className="font-medium">{t('viewCart')}</span>
              </div>
              <span className="font-bold">{formatCurrency(total, '', '')}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
