'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Download,
  ToggleLeft,
  ToggleRight,
  Loader2,
  DoorOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Room, RoomType } from '@/types'
import RoomFormModal from './RoomFormModal'
import QRCode from 'qrcode'

export default function RoomsPage() {
  const t = useTranslations('rooms')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 25
  const totalPages = Math.ceil(total / limit)
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [qrLoading, setQrLoading] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // QR Settings
  const [hotelLogoUrl, setHotelLogoUrl] = useState<string | null>(null)
  const [barcodeTextTranslations, setBarcodeTextTranslations] = useState<Record<string, string>>({})
  const [qrLanguage, setQrLanguage] = useState<'ar' | 'en' | 'both'>(locale as 'ar' | 'en' | 'both')
  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (floorFilter) params.set('floor', floorFilter)
      if (typeFilter) params.set('room_type', typeFilter)
      params.set('page', page.toString())
      params.set('limit', limit.toString())

      const res = await fetch(`/api/rooms?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setRooms(data.rooms)
        setTotal(data.total || 0)
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [search, floorFilter, typeFilter, page, limit, tc])

  const fetchHotelRoomTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.success && data.settings) {
        if (data.settings.room_types) {
          setRoomTypes(data.settings.room_types)
        }
        setHotelLogoUrl(data.settings.hotel_logo_url || null)
        setBarcodeTextTranslations(data.settings.barcode_text_translations || {})
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchHotelRoomTypes()
  }, [fetchHotelRoomTypes])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms, page])

  useEffect(() => {
    const generateQR = async () => {
      if (selectedRoom) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          const url = new URL(`${appUrl}/guest/${selectedRoom.qr_code}`)
          url.searchParams.set('lang', qrLanguage === 'both' ? 'ar' : qrLanguage)
          const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })
          setSelectedQR(qrDataUrl)
        } catch {
          toast.error(tc('error'))
        }
      }
    }
    generateQR()
  }, [selectedRoom, qrLanguage, tc])

  const requestDelete = (roomId: string) => {
    setDeletingId(roomId)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/rooms/${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchRooms()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (room: Room) => {
    setTogglingId(room.room_id)
    const newStatus = room.status === 'active' ? 'inactive' : 'active'
    try {
      const res = await fetch(`/api/rooms/${room.room_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchRooms()
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setTogglingId(null)
    }
  }

  const handleGenerateQR = async (roomId: string) => {
    setQrLoading(roomId)
    try {
      const res = await fetch(`/api/rooms/${roomId}/qr`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchRooms()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setQrLoading(null)
    }
  }

  const handleDownloadQR = async (room: Room) => {
    setQrLoading(room.room_id)
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const url = new URL(`${appUrl}/guest/${room.qr_code}`)
      url.searchParams.set('lang', qrLanguage === 'both' ? 'ar' : qrLanguage)
      const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')

      // Determine text content based on selected language
      let customTextAr = ''
      let customTextEn = ''
      if (qrLanguage === 'both') {
        customTextAr = barcodeTextTranslations.ar || ''
        customTextEn = barcodeTextTranslations.en || ''
      } else if (qrLanguage === 'ar') {
        customTextAr = barcodeTextTranslations.ar || ''
      } else {
        customTextEn = barcodeTextTranslations.en || ''
      }

      // Dimensions
      const QR_SIZE = 400
      const PADDING = 40
      const HEADER_HEIGHT = PADDING

      const TEXT_GAP_AR = customTextAr ? 35 : 0
      const TEXT_GAP_EN = customTextEn ? 35 : 0
      const FOOTER_HEIGHT = 80 + TEXT_GAP_AR + TEXT_GAP_EN

      canvas.width = QR_SIZE + PADDING * 2
      canvas.height = HEADER_HEIGHT + QR_SIZE + FOOTER_HEIGHT

      // Draw background
      // Shadow and border effect - simplified to just a white bg with rounded rectangle
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR Code
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          // Draw a subtle border around QR
          ctx.shadowColor = 'rgba(0, 0, 0, 0.05)'
          ctx.shadowBlur = 10
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.roundRect(PADDING - 10, HEADER_HEIGHT - 10, QR_SIZE + 20, QR_SIZE + 20, 20)
          ctx.fill()

          // Restore shadow for image
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.drawImage(img, PADDING, HEADER_HEIGHT, QR_SIZE, QR_SIZE)
          resolve()
        }
        img.onerror = reject
        img.src = qrDataUrl
      })

      // Draw logo in the middle of QR if exists
      if (hotelLogoUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const logoSize = QR_SIZE * 0.22
            const cx = PADDING + QR_SIZE / 2
            const cy = HEADER_HEIGHT + QR_SIZE / 2

            // Draw white background
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.roundRect(cx - logoSize / 2 - 6, cy - logoSize / 2 - 6, logoSize + 12, logoSize + 12, 12)
            ctx.fill()

            // Draw image
            let w = img.width
            let h = img.height
            if (w > h) {
              h = h * (logoSize / w); w = logoSize;
            } else {
              w = w * (logoSize / h); h = logoSize;
            }
            ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = hotelLogoUrl
        })
      }

      // Draw Text
      let currentY = HEADER_HEIGHT + QR_SIZE + 40
      ctx.textAlign = 'center'

      if (customTextAr) {
        ctx.font = '500 24px system-ui'
        ctx.fillStyle = '#6b7280' // gray-500
        ctx.fillText(customTextAr, canvas.width / 2, currentY)
        currentY += 35
      }

      ctx.font = 'bold 32px system-ui'
      ctx.fillStyle = '#111827' // gray-900
      if (qrLanguage === 'both') {
        ctx.fillText(t('roomQrBoth', { number: room.room_number }), canvas.width / 2, currentY)
      } else {
        ctx.fillText(t('roomQr', { number: room.room_number }), canvas.width / 2, currentY)
      }
      currentY += 40

      if (customTextEn) {
        ctx.font = '500 24px system-ui'
        ctx.fillStyle = '#6b7280' // gray-500
        ctx.fillText(customTextEn, canvas.width / 2, currentY)
      }

      const link = document.createElement('a')
      link.download = `QR_Room_${room.room_number}_${qrLanguage}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error(err)
      toast.error(tc('error'))
    } finally {
      setQrLoading(null)
    }
  }

  const handleViewQR = async (room: Room) => {
    try {
      // The QR logic is handled in useEffect listening on selectedRoom, so we simply set it
      setSelectedRoom(room)
    } catch {
      toast.error(tc('error'))
    }
  }

  const openAdd = () => {
    setEditingRoom(null)
    setModalOpen(true)
  }

  const openEdit = (room: Room) => {
    setEditingRoom(room)
    setModalOpen(true)
  }

  const getRoomTypeName = (code: string) => {
    const rt = roomTypes.find((r) => r.code === code)
    if (!rt) return code
    return rt.name?.[locale] || rt.name?.en || code
  }

  const floors = [...new Set(rooms.map((r) => r.floor_number).filter((f): f is number => f !== null))].sort(
    (a, b) => a - b
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" />
          {t('addRoom')}
        </button>
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder={`${tc('search')} (${t('roomNumber')})`}
            className="input max-w-[200px] py-1.5 text-sm"
          />
        </div>

        {/* Floor Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={floorFilter}
            onChange={(e) => {
              setFloorFilter(e.target.value)
              setPage(1)
            }}
            className="input max-w-[150px] py-1.5 text-sm"
          >
            <option value="">{t('floor')} ({tc('all')})</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setPage(1)
            }}
            className="input max-w-[150px] py-1.5 text-sm"
          >
            <option value="">{t('type')} ({tc('all')})</option>
            {roomTypes.map((rt) => (
              <option key={rt.code} value={rt.code}>
                {rt.name?.[locale] || rt.name?.en || rt.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <DoorOpen className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">{t('noRooms')}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('roomNumber')}</th>
                <th>{t('floor')}</th>
                <th>{t('roomType')}</th>
                <th>{tc('status')}</th>
                <th>{t('qrCode')}</th>
                <th>{t('notes')}</th>
                <th>{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id}>
                  <td className="font-medium text-gray-900">
                    {room.room_number}
                  </td>
                  <td>{room.floor_number ?? '\u2014'}</td>
                  <td>{getRoomTypeName(room.room_type)}</td>
                  <td>
                    <span
                      className={
                        room.status === 'active'
                          ? 'badge-active'
                          : 'badge-inactive'
                      }
                    >
                      {room.status === 'active' ? tc('active') : tc('inactive')}
                    </span>
                  </td>
                  <td>
                    {room.qr_code ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewQR(room)}
                          className="btn-ghost p-1 text-primary-600"
                          title={t('viewQR')}
                        >
                          <QrCode className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleGenerateQR(room.room_id)}
                        className="btn-ghost p-1 text-xs text-primary-600"
                        disabled={qrLoading === room.room_id}
                      >
                        {qrLoading === room.room_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="h-4 w-4" />
                            <span>{t('generateQR')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate text-gray-500">
                    {room.notes || '\u2014'}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(room)}
                        className="btn-ghost p-2"
                        title={tc('edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(room)}
                        className="btn-ghost p-2"
                        disabled={togglingId === room.room_id}
                        title={
                          room.status === 'active'
                            ? tc('inactive')
                            : tc('active')
                        }
                      >
                        {togglingId === room.room_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : room.status === 'active' ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => requestDelete(room.room_id)}
                        className="btn-ghost p-2 text-red-600 hover:text-red-700"
                        title={tc('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-xl shadow-sm">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {tc('showing')} <span className="font-medium">{(page - 1) * limit + 1}</span> {tc('to')}{' '}
                <span className="font-medium">
                  {Math.min(page * limit, total)}
                </span>{' '}
                {tc('of')} <span className="font-medium">{total}</span> {tc('results')}
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-s-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  {locale === 'ar' ? (
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                <div className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:z-20 focus:outline-offset-0">
                  {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-e-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  {locale === 'ar' ? (
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <RoomFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchRooms}
        room={editingRoom}
        roomTypes={roomTypes}
      />

      {/* QR Preview Modal */}
      {selectedQR && selectedRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => { setSelectedQR(null); setSelectedRoom(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl flex flex-col items-center max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center w-full mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {t('roomNumber')}: <span className="text-primary-600">{selectedRoom.room_number}</span>
              </h3>
              <select
                value={qrLanguage}
                onChange={(e) => setQrLanguage(e.target.value as 'ar' | 'en' | 'both')}
                className="input py-1 px-2 text-sm !w-fit min-w-[100px]"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="both">كلاهما / Both</option>
              </select>
            </div>

            {/* The beautiful card layout */}
            <div id="qr-card-preview" className="bg-white p-8 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center space-y-6 w-80 relative mb-6">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50/50 to-transparent rounded-t-[2rem]" />

              <div className="p-3 border border-gray-100/80 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative flex items-center justify-center">
                <img src={selectedQR} alt={`QR code for room ${selectedRoom.room_number}`} className="w-48 h-48" />
                {hotelLogoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-xl shadow-sm flex items-center justify-center w-[22%] h-[22%]">
                      <img src={hotelLogoUrl} alt="Hotel Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 w-full pt-2">
                {(qrLanguage === 'ar' || qrLanguage === 'both') && barcodeTextTranslations.ar && (
                  <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextTranslations.ar}</span>
                )}

                {qrLanguage === 'both' ? (
                  <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 leading-none py-1">
                    <span>{t('roomQrBoth', { number: selectedRoom.room_number })}</span>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-gray-900 text-center">
                    {t('roomQr', { number: selectedRoom.room_number })}
                  </p>
                )}

                {(qrLanguage === 'en' || qrLanguage === 'both') && barcodeTextTranslations.en && (
                  <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextTranslations.en}</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setSelectedQR(null); setSelectedRoom(null); }}
                className="btn-secondary flex-1"
              >
                {tc('close')}
              </button>
              <button
                onClick={() => handleDownloadQR(selectedRoom)}
                className="btn-primary flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                {t('downloadQR')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {tc('delete')}
                </h3>
                <p className="text-sm text-gray-500">
                  {tc('confirmDelete')}
                </p>
              </div>
              <div className="mt-6 flex gap-3 w-full">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 btn-secondary py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white rounded-xl py-2.5 font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-600 transition-all shadow-sm"
                >
                  {tc('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
