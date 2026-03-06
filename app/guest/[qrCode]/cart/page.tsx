'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import {
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  Package,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import { toast } from 'sonner'
import { saveMyOrderIds } from '@/lib/hooks/use-order-notifications'

interface GuestInfo {
  hotel: {
    currency_code: string
    currency_symbol: string
  }
}

export default function CartPage({
  params,
}: {
  params: Promise<{ qrCode: string }>
}) {
  const { qrCode } = use(params)
  const t = useTranslations('guest')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const router = useRouter()

  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCartStore()

  // Track notes per service ID
  const [multiNotes, setMultiNotes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Ensure hydration for persistent store
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

  const total = getTotal()
  const currencySymbol = guestInfo?.hotel.currency_symbol || ''
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  if (!isHydrated) return null

  // Group items by service
  const groupedItemsMap = items.reduce((acc, ci) => {
    const sId = ci.serviceId || 'other'
    if (!acc[sId]) {
      acc[sId] = {
        name: ci.serviceName || { ar: 'خدمات أخرى', en: 'Other Services' },
        displayOrder: ci.serviceDisplayOrder || 999,
        items: [],
        subtotal: 0
      }
    }
    acc[sId].items.push(ci)
    acc[sId].subtotal += (ci.item.is_free ? 0 : ci.item.price) * ci.quantity
    return acc
  }, {} as Record<string, { name: Record<string, string>; displayOrder: number; items: typeof items; subtotal: number }>)

  // Sort groups by display order
  const sortedServiceIds = Object.keys(groupedItemsMap).sort(
    (a, b) => groupedItemsMap[a].displayOrder - groupedItemsMap[b].displayOrder
  )

  const handlePlaceOrder = async () => {
    if (items.length === 0) return

    setSubmitting(true)
    try {
      const orderItems = items.map((ci) => ({
        item_id: ci.item.item_id,
        quantity: ci.quantity,
      }))

      const res = await fetch(`/api/guest/${qrCode}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          notes: multiNotes,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Save order IDs so only this device gets notifications for these orders
        if (data.orders && Array.isArray(data.orders)) {
          saveMyOrderIds(data.orders.map((o: { order_id: string }) => o.order_id))
        }
        clearCart()
        toast.success(t('orderPlaced'))
        router.push(`/guest/${qrCode}/orders`)
      } else {
        toast.error(data.message || t('orderError'))
      }
    } catch {
      toast.error(t('orderError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{t('emptyCart')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('emptyCartDesc')}</p>
        <Link href={`/guest/${qrCode}`} className="btn-primary mt-6">
          {t('browseServices')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 px-1">
        <Link
          href={`/guest/${qrCode}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-600 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
        >
          <BackArrow className="h-5 w-5" />
        </Link>
        <h2 className="text-xl font-black text-gray-900">{t('cart')}</h2>
        <div className="h-6 w-6 rounded-full bg-primary-600 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">{items.length}</span>
        </div>
      </div>

      <div className="space-y-8">
        {sortedServiceIds.map((serviceId) => {
          const group = groupedItemsMap[serviceId]
          const serviceName = group.name[locale] || group.name.en || group.name.ar || ''

          return (
            <div key={serviceId} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-md flex items-center gap-2 font-black text-gray-800 uppercase tracking-wide">
                  <span className="h-4 w-1.5 rounded-full bg-primary-600" />
                  {serviceName}
                </h3>
              </div>

              <div className="space-y-3 px-1">
                {group.items.map((cartItem) => {
                  const item = cartItem.item
                  const itemName = item.item_name[locale] || item.item_name.en || item.item_name.ar || ''
                  const itemUnit = (item as any).unit ? ((item as any).unit[locale] || (item as any).unit.en || (item as any).unit.ar || '') : ''
                  const subtotal = (item.is_free ? 0 : item.price) * cartItem.quantity

                  return (
                    <div key={item.item_id} className="relative bg-white border border-gray-100 rounded-[28px] p-4 shadow-sm transition-all">
                      <div className="flex gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-50 text-gray-400 border border-gray-50">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={itemName}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-50">
                              <Package className="h-8 w-8 text-primary-200" />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between py-0.5">
                          <div className="flex items-start justify-between">
                            <div className="pr-8">
                              <h4 className="font-black text-gray-900 text-[15px] leading-tight">{itemName}</h4>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{serviceName}</p>
                            </div>
                            <button
                              onClick={() => removeItem(item.item_id)}
                              className="absolute top-4 ltr:right-4 rtl:left-4 p-2 bg-red-50 text-red-500 rounded-xl transition-colors hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm font-black text-primary-600">
                              {item.is_free ? (locale === 'ar' ? 'مجاني' : 'Free') : formatCurrency(item.price, '', currencySymbol)}
                              {itemUnit && <span className="text-[10px] text-gray-400 font-medium mx-1">/ {itemUnit}</span>}
                            </span>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => updateQuantity(item.item_id, cartItem.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 active:scale-90"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-6 text-center text-sm font-black text-gray-900">{cartItem.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.item_id, cartItem.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700 active:scale-90"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Note per service */}
              <div className="px-1">
                <textarea
                  value={multiNotes[serviceId] || ''}
                  onChange={(e) => setMultiNotes({ ...multiNotes, [serviceId]: e.target.value })}
                  placeholder={`${t('notesPlaceholder')} (${serviceName})`}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl text-sm border-gray-100 bg-gray-50/50 focus:bg-white focus:border-primary-500 focus:ring-0 transition-all resize-none placeholder:text-gray-400"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Card with Service Breakdown */}
      <div className="card space-y-4 bg-white border border-gray-100 rounded-[32px] p-6 shadow-xl shadow-gray-100/50">
        <h3 className="text-sm font-black text-gray-900 border-b border-gray-50 pb-3 mb-2">{t('orderSummary')}</h3>
        <div className="space-y-3">
          {sortedServiceIds.map(sId => {
            const group = groupedItemsMap[sId]
            return (
              <div key={sId} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">
                  {group.name[locale] || group.name.en || group.name.ar || ''}
                </span>
                <span className="text-gray-900 font-black">{formatCurrency(group.subtotal, '', currencySymbol)}</span>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-black text-gray-900">{t('total')}</span>
            <span className="text-2xl font-black text-primary-600">
              {formatCurrency(total, '', currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handlePlaceOrder}
        disabled={submitting}
        className="btn-primary w-full !py-4.5 !text-lg !rounded-[24px] shadow-2xl shadow-primary-600/40 active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        {submitting ? (
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-black">{t('placingOrder')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-black">{t('checkout')}</span>
          </div>
        )}
      </button>
    </div>
  )
}
