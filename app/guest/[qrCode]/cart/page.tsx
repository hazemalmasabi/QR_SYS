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
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCartStore } from '@/lib/stores/cart-store'
import { toast } from 'sonner'

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

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)

  useEffect(() => {
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
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
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

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <ShoppingBag className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{t('emptyCart')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('emptyCartDesc')}</p>
        <Link
          href={`/guest/${qrCode}`}
          className="btn-primary mt-6"
        >
          {t('browseServices')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/guest/${qrCode}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
        >
          <BackArrow className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-bold text-gray-900">{t('cart')}</h2>
        <span className="badge-new">{items.length} {t('itemsCount')}</span>
      </div>

      {/* Cart Items */}
      <div className="card !p-0 divide-y divide-gray-100">
        {items.map((cartItem) => {
          const item = cartItem.item
          const itemName = locale === 'ar' ? item.item_name.ar : item.item_name.en
          const subtotal = item.price * cartItem.quantity

          return (
            <div key={item.item_id} className="flex gap-3 p-4">
              {/* Item Image */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={itemName}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl">🍽️</span>
                )}
              </div>

              {/* Item Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900">{itemName}</h4>
                  <button
                    onClick={() => removeItem(item.item_id)}
                    className="p-1 text-gray-400 transition-colors hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.item_id, cartItem.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{cartItem.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.item_id, cartItem.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white transition-colors hover:bg-primary-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(subtotal, '', currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div className="card">
        <label className="label">{t('notes')}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          rows={3}
          className="input resize-none"
        />
      </div>

      {/* Order Summary */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{t('subtotal')}</span>
          <span>{formatCurrency(total, '', currencySymbol)}</span>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">{t('total')}</span>
            <span className="text-lg font-bold text-primary-600">
              {formatCurrency(total, '', currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={submitting}
        className="btn-primary w-full !py-3.5 !text-base !rounded-2xl shadow-lg shadow-primary-600/20"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('placingOrder')}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            {t('checkout')}
          </>
        )}
      </button>
    </div>
  )
}
