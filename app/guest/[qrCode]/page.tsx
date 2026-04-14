'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Clock, ChevronLeft, ChevronRight, Loader2, Lock, MapPin, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react'
import { isWithinServiceHours } from '@/lib/utils'
import type { MainService } from '@/types'

interface GuestInfo {
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

/** Extract lat/lng from a Google Maps URL */
function extractCoordsFromGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Handles both @lat,lng and ?q=lat,lng formats
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }

    // maps/place/.../@lat,lng
    const placeMatch = url.match(/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (placeMatch) return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }

    return null
  } catch {
    return null
  }
}

/** Haversine distance in meters */
function haversineDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const MAX_DISTANCE_METERS = 500 // 500m allowed radius

type LocationState =
  | 'idle'
  | 'requesting'
  | 'verifying'
  | 'success'
  | 'denied'
  | 'out_of_range'
  | 'coords_error'

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
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null)

  // Location verification state
  const [locationState, setLocationState] = useState<LocationState>('idle')

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

        // If location verification is enabled, start requesting immediately
        if (infoData.hotel?.location_verification_enabled) {
          setLocationState('requesting')
        } else {
          setLocationState('success') // no verification needed
        }
      } catch {
        setError(t('invalidQR'))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [qrCode, t])

  const handleRequestLocation = () => {
    if (!guestInfo) return
    setLocationState('requesting')

    if (!navigator.geolocation) {
      setLocationState('denied')
      return
    }

    setLocationState('verifying')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords

        const mapsUrl = guestInfo.hotel.hotel_google_maps_url
        if (!mapsUrl) {
          // No coords configured — allow access
          setLocationState('success')
          return
        }

        const hotelCoords = extractCoordsFromGoogleMapsUrl(mapsUrl)
        if (!hotelCoords) {
          setLocationState('coords_error')
          return
        }

        const distMeters = haversineDistanceMeters(latitude, longitude, hotelCoords.lat, hotelCoords.lng)
        if (distMeters <= MAX_DISTANCE_METERS) {
          setLocationState('success')
        } else {
          setLocationState('out_of_range')
        }
      },
      () => {
        setLocationState('denied')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

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

  // ── Location Verification Gate ──
  if (guestInfo?.hotel.location_verification_enabled && locationState !== 'success') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-xl text-center space-y-5">
          {/* Icon */}
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            locationState === 'denied' || locationState === 'out_of_range' || locationState === 'coords_error'
              ? 'bg-red-50'
              : locationState === 'verifying'
              ? 'bg-blue-50'
              : 'bg-primary-50'
          }`}>
            {locationState === 'verifying' ? (
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            ) : locationState === 'denied' ? (
              <AlertTriangle className="h-10 w-10 text-red-500" />
            ) : locationState === 'out_of_range' ? (
              <MapPin className="h-10 w-10 text-red-500" />
            ) : locationState === 'coords_error' ? (
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            ) : (
              <Shield className="h-10 w-10 text-primary-600" />
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {locationState === 'verifying'
                ? t('locationVerifying')
                : locationState === 'denied'
                ? t('locationDenied')
                : locationState === 'out_of_range'
                ? t('locationOutOfRange')
                : locationState === 'coords_error'
                ? t('locationCoordsError')
                : t('locationRequired')
              }
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {locationState === 'verifying'
                ? t('locationVerifyingDesc')
                : locationState === 'denied'
                ? t('locationDeniedDesc')
                : locationState === 'out_of_range'
                ? t('locationOutOfRangeDesc')
                : locationState === 'coords_error'
                ? t('locationCoordsErrorDesc')
                : t('locationRequiredDesc')
              }
            </p>
          </div>

          {/* Action button */}
          {(locationState === 'idle' || locationState === 'requesting' || locationState === 'denied' || locationState === 'out_of_range' || locationState === 'coords_error') && (
            <button
              onClick={handleRequestLocation}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {locationState === 'denied' || locationState === 'out_of_range' || locationState === 'coords_error'
                ? t('locationTryAgain')
                : t('locationShareBtn')
              }
            </button>
          )}

          {locationState === 'denied' && (
            <p className="text-xs text-gray-400">{t('locationDeniedHint')}</p>
          )}
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
        <p className="mt-1 text-primary-100">{t('browseServices')}</p>
        {guestInfo?.hotel.location_verification_enabled && locationState === 'success' && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t('locationVerified')}</span>
          </div>
        )}
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
          {[...services]
            .sort((a, b) => {
              const timezone = guestInfo?.hotel.timezone || 'Asia/Riyadh'
              const aIsScheduled = a.availability_type === 'scheduled' && a.start_time && a.end_time
              const aIsOpen = !aIsScheduled || isWithinServiceHours(a.start_time!, a.end_time!, timezone)
              const bIsScheduled = b.availability_type === 'scheduled' && b.start_time && b.end_time
              const bIsOpen = !bIsScheduled || isWithinServiceHours(b.start_time!, b.end_time!, timezone)

              if (aIsOpen === bIsOpen) {
                return (a.display_order ?? 0) - (b.display_order ?? 0)
              }
              return aIsOpen ? -1 : 1
            })
            .map((service) => {
              const name = service.service_name[locale] || service.service_name.en || service.service_name.ar || ''
              const desc = service.description[locale] || service.description.en || service.description.ar || ''
              const timezone = guestInfo?.hotel.timezone || 'Asia/Riyadh'

              const isScheduled = service.availability_type === 'scheduled' && service.start_time && service.end_time
              const isOpen = !isScheduled || isWithinServiceHours(service.start_time!, service.end_time!, timezone)
              const formatTime = (time: string) => time.slice(0, 5)

              const isDescExpanded = expandedDescId === service.service_id
              const shouldTruncateDesc = desc && desc.length > 80

              const card = (
                <div
                  className={`group card !p-0 overflow-hidden transition-all hover:shadow-md active:scale-[0.98] ${!isOpen && 'bg-gray-50'}`}
                >
                  <div className={`flex items-center gap-4 p-4 ${!isOpen && 'opacity-80'}`}>
                    {/* Service Image */}
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-50">
                      {service.image_url ? (
                        <Image src={service.image_url} alt={name} width={64} height={64} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl">🛎️</span>
                      )}
                    </div>

                    {/* Service Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`font-semibold ${isOpen ? 'text-gray-900 group-hover:text-primary-600' : 'text-gray-500'} transition-colors`}>
                          {name}
                        </h4>
                        {isOpen && !isScheduled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{t('workingHours')}</span>
                            <span>{t('allDay')}</span>
                          </span>
                        )}
                        {isOpen && isScheduled && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                            <Clock className="h-2.5 w-2.5" />
                            <span>{t('workingHours')}</span>
                            <span dir="ltr">{formatTime(service.start_time!)}</span> - <span dir="ltr">{formatTime(service.end_time!)}</span>
                          </span>
                        )}
                        {!isOpen && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                            <Lock className="h-2.5 w-2.5" />
                            {t('closed')}
                          </span>
                        )}
                      </div>

                      {/* Expandable Description */}
                      {desc && (
                        <div className="mt-0.5">
                          <p className={`text-sm text-gray-500 ${!isDescExpanded && shouldTruncateDesc ? 'line-clamp-2' : ''}`}>
                            {desc}
                          </p>
                          {shouldTruncateDesc && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setExpandedDescId(isDescExpanded ? null : service.service_id)
                              }}
                              className="mt-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              {isDescExpanded ? t('showLess') : t('readMore')}
                            </button>
                          )}
                        </div>
                      )}

                      {!isOpen && isScheduled && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <Clock className="h-3 w-3" />
                          <span><span dir="ltr">{formatTime(service.start_time!)}</span> - <span dir="ltr">{formatTime(service.end_time!)}</span> · {t('outsideServiceHours')}</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ArrowIcon className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              )

              return (
                <Link key={service.service_id} href={`/guest/${qrCode}/service/${service.service_id}`}>
                  {card}
                </Link>
              )
            })}
        </div>
      )}
    </div>
  )
}
