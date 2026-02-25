'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { MainService } from '@/types'

interface GuestInfo {
  room: { room_id: string; room_number: string; room_type: string }
  hotel: {
    hotel_id: string
    hotel_name: string
    timezone: string
    currency_code: string
    currency_symbol: string
  }
}

export default function GuestPage({
  params,
}: {
  params: Promise<{ qrCode: string }>
}) {
  const { qrCode } = use(params)
  const t = useTranslations('guest')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [services, setServices] = useState<MainService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [infoRes, servicesRes] = await Promise.all([
          fetch(`/api/guest/${qrCode}`),
          fetch(`/api/guest/${qrCode}/services`),
        ])

        const infoData = await infoRes.json()
        const servicesData = await servicesRes.json()

        if (!infoData.success) {
          setError(infoData.message === 'roomInactive' ? t('roomInactive') : t('invalidQR'))
          return
        }

        setGuestInfo(infoData)
        if (servicesData.success) {
          setServices(servicesData.services)
        }
      } catch {
        setError(t('invalidQR'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [qrCode, t])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-3 text-sm text-gray-500">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{error}</h2>
        </div>
      </div>
    )
  }

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-lg">
        <h2 className="text-xl font-bold">{t('welcome')} 👋</h2>
        <p className="mt-1 text-primary-100">
          {guestInfo?.hotel.hotel_name}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
          🏨 {t('room')}: <span className="font-bold">{guestInfo?.room.room_number}</span>
        </div>
      </div>

      {/* Services Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{t('selectService')}</h3>
        <p className="mt-0.5 text-sm text-gray-500">{t('browseServices')}</p>
      </div>

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">{t('noServices')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {services.map((service) => {
            const name = locale === 'ar' ? service.service_name.ar : service.service_name.en
            const desc = locale === 'ar' ? service.description.ar : service.description.en

            return (
              <Link
                key={service.service_id}
                href={`/guest/${qrCode}/service/${service.service_id}`}
                className="group card !p-0 overflow-hidden transition-all hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Service Image */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50">
                    {service.image_url ? (
                      <Image
                        src={service.image_url}
                        alt={name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">🛎️</span>
                    )}
                  </div>

                  {/* Service Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {name}
                    </h4>
                    {desc && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                        {desc}
                      </p>
                    )}
                    {service.availability_type === 'scheduled' && service.start_time && service.end_time && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{service.start_time} - {service.end_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowIcon className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
