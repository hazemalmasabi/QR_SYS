'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
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
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Room, RoomType } from '@/types'
import RoomFormModal from './RoomFormModal'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import BulkImportModal from './BulkImportModal'
import SessionRecordsModal from './SessionRecordsModal'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

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
  const [sessionLoading, setSessionLoading] = useState<string | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false)
  const [isPrimarySupervisor, setIsPrimarySupervisor] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [selectedSessionRoom, setSelectedSessionRoom] = useState<Room | null>(null)
  const [successAlert, setSuccessAlert] = useState<{ title: string; subtitle: string; roomNumber: string; type: 'checkin' | 'checkout' } | null>(null)
  const [checkoutConfirm, setCheckoutConfirm] = useState<Room | null>(null)
  const [pendingOrdersConfirm, setPendingOrdersConfirm] = useState<Room | null>(null)
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [errorAlert, setErrorAlert] = useState<{ title: string; subtitle: string; roomNumber?: string } | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [isRealtimeUpdating, setIsRealtimeUpdating] = useState(false)

  // QR Export Settings
  const [qrSizeCm, setQrSizeCm] = useState<number>(5)
  const [bulkQrLoading, setBulkQrLoading] = useState(false)
  const [isBulkQR, setIsBulkQR] = useState(false)

  const QR_SIZES = useMemo(() => [
    { label: '4x4 cm', value: 4 },
    { label: '5x5 cm', value: 5 },
    { label: '6x6 cm', value: 6 },
    { label: '7x7 cm', value: 7 },
    { label: '8x8 cm', value: 8 },
    { label: '10x10 cm', value: 10 },
    { label: '12x12 cm', value: 12 },
    { label: '15x15 cm', value: 15 },
    { label: `B5 / JIS B5 (18.2x25.7 ${t('cm')})`, value: 18.2 },
    { label: `A6 (10.5x14.8 ${t('cm')})`, value: 10.5 },
    { label: `A5 (14.8x21 ${t('cm')})`, value: 14.8 },
    { label: `A4 (21x29.7 ${t('cm')})`, value: 21 },
    { label: `A3 (29.7x42 ${t('cm')})`, value: 29.7 },
    { label: `B4 / JIS B4 (25.7x36.4 ${t('cm')})`, value: 25.7 },
    { label: `Letter (21.6x27.9 ${t('cm')})`, value: 21.6 },
    { label: `Legal (21.6x35.6 ${t('cm')})`, value: 21.59 },
    { label: `3x5" Index (7.6x12.7 ${t('cm')})`, value: 7.6 },
    { label: `4x6" Photo (10.1x15.2 ${t('cm')})`, value: 10.1 },
    { label: `5x7" Photo (12.7x17.8 ${t('cm')})`, value: 12.7 },
    { label: `8x10" Portrait (20.3x25.4 ${t('cm')})`, value: 20.3 },
    { label: `Executive (18.4x26.6 ${t('cm')})`, value: 18.4 },
    { label: `Statement (14x21.6 ${t('cm')})`, value: 14 },
    { label: `Envelope #10 (10.4x24.1 ${t('cm')})`, value: 10.4 },
    { label: `Envelope DL (11x22 ${t('cm')})`, value: 11 },
    { label: `Envelope C5 (16.2x22.9 ${t('cm')})`, value: 16.2 },
  ], [t])

  // QR Settings
  const [hotelLogoUrl, setHotelLogoUrl] = useState<string | null>(null)
  const [allDefaults, setAllDefaults] = useState<Record<string, { barcode: string, room: string }>>({})
  const [barcodeTextTranslations, setBarcodeTextTranslations] = useState<Record<string, string>>({})
  const [languageSecondary, setLanguageSecondary] = useState<string>('none')
  const [qrLanguage, setQrLanguage] = useState<string>(locale === 'en' ? 'en' : 'en') // will be updated in fetch

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session) {
          setIsPrimarySupervisor(!!data.session.isPrimarySupervisor)
        }
      })
      .catch(() => {})
  }, [])

  const fetchRooms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (floorFilter) params.set('floor', floorFilter)
      if (typeFilter) params.set('room_type', typeFilter)
      if (unpaidOnly) params.set('unpaid_only', 'true')
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      params.set('_t', Date.now().toString()) // cache busting

      const res = await fetch(`/api/rooms?${params.toString()}`, {
        cache: 'no-store',
        headers: {
           'Pragma': 'no-cache',
           'Cache-Control': 'no-cache'
        }
      })
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
  }, [search, floorFilter, typeFilter, page, limit, unpaidOnly, tc])

  const fetchHotelRoomTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      
      const defaultsRes = await fetch('/api/translations/defaults')
      const defaultsData = await defaultsRes.json()

      if (data.success && data.settings) {
        if (data.settings.room_types) {
          setRoomTypes(data.settings.room_types)
        }
        setHotelLogoUrl(data.settings.hotel_logo_url || null)
        
        if (defaultsData) {
          setAllDefaults(defaultsData)
        }
        
        const mergedTranslations: Record<string, string> = {}
        if (defaultsData) {
          Object.keys(defaultsData).forEach(lang => {
            mergedTranslations[lang] = defaultsData[lang].barcode
          })
        }
        
        const backendTranslations = data.settings.barcode_text_translations || {}
        
        for (const lang in backendTranslations) {
          if (backendTranslations[lang] && backendTranslations[lang].trim() !== '') {
            mergedTranslations[lang] = backendTranslations[lang]
          }
        }
        
        setBarcodeTextTranslations(mergedTranslations)
        const sec = data.settings.language_secondary || 'none'
        setLanguageSecondary(sec)
        // Set initial QR language based on availability
        if (sec !== 'none' && locale !== 'en') {
          setQrLanguage(sec)
        } else {
          setQrLanguage('en')
        }
      }
    } catch {
      // silently fail
    }
  }, [locale])

  useEffect(() => {
    fetchHotelRoomTypes()
  }, [fetchHotelRoomTypes])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms, page, search, floorFilter, typeFilter, unpaidOnly, refreshCounter])

  // Fallback Polling (Every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCounter(c => c + 1)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleRealtimeChange = (payload: any) => {
      console.log('Realtime change detected in RoomsPage:', payload.table)
      setIsRealtimeUpdating(true)
      setRefreshCounter(c => c + 1)
      setTimeout(() => setIsRealtimeUpdating(false), 2000)
    }

    const channel = supabase.channel('rooms-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guest_sessions' }, handleRealtimeChange)
      .subscribe((status) => {
        console.log('Supabase Realtime Status (RoomsPage):', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) // Empty deps to keep subscription stable

  useEffect(() => {
    const generateQR = async () => {
      if (selectedRoom) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          const url = new URL(`${appUrl}/guest/${selectedRoom.qr_code}`)
          url.searchParams.set('lang', qrLanguage === 'both' ? (languageSecondary !== 'none' ? languageSecondary : 'en') : qrLanguage)
          const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })
          setSelectedQR(qrDataUrl)
        } catch {
          toast.error(tc('error'))
        }
      }
    }
    generateQR()
  }, [selectedRoom, qrLanguage, tc, languageSecondary]) // Fixed dependencies

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

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    try {
      const res = await fetch(`/api/rooms/delete-all`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchRooms()
        setDeleteAllConfirmOpen(false)
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setDeletingAll(false)
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

  const handleCheckIn = async (roomId: string) => {
    setSessionLoading(roomId)
    try {
      const res = await fetch(`/api/rooms/${roomId}/checkin`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (data.success) {
        setSuccessAlert({
          title: t('checkInSuccess'),
          subtitle: t('checkInSuccessDesc') || '',
          roomNumber: rooms.find(r => r.room_id === roomId)?.room_number || '',
          type: 'checkin'
        })
        fetchRooms()
      } else {
        toast.error(data.message ? t(data.message as any) : tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setSessionLoading(null)
    }
  }

  const handleCheckOut = async (room: Room, forceCancel = false) => {
    if (!forceCancel) {
      setCheckoutConfirm(room)
      return
    }
    setCheckoutConfirm(null) // Close the confirmation modal before proceeding
    
    setSessionLoading(room.room_id)
    try {
      const res = await fetch(`/api/rooms/${room.room_id}/checkout`, { 
        method: 'POST', 
        body: JSON.stringify({ cancelPendingOrders: forceCancel }) 
      })
      const data = await res.json()
      if (data.success) {
        setSuccessAlert({
          title: t('checkOutSuccess'),
          subtitle: t('checkOutSuccessDesc') || '',
          roomNumber: room.room_number,
          type: 'checkout'
        })
        fetchRooms()
      } else if (data.message === 'hasPendingOrders') {
        setPendingOrdersConfirm(room)
      } else if (data.message === 'hasUnpaidBalance') {
        setErrorAlert({
           title: room.room_number + " - " + t('remainingBalance'),
           subtitle: t('hasUnpaidBalance'),
           roomNumber: room.room_number
        })
      } else {
        toast.error(data.message ? t(data.message as any) : tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setSessionLoading(null)
    }
  }

  // Helper to generate a canvas for a specific room and language
  const generateQRCanvas = async (room: Room, lang: string): Promise<HTMLCanvasElement> => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const url = new URL(`${appUrl}/guest/${room.qr_code}`)
    url.searchParams.set('lang', lang === 'both' ? (languageSecondary !== 'none' ? languageSecondary : 'en') : lang)
    const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    // Dimensions
    const QR_SIZE = 400
    const PADDING = 40
    const HEADER_HEIGHT = PADDING

    // Determine text content based on selected language
    let customTextSec = ''
    let customTextEn = ''
    if (lang === 'both') {
      customTextSec = barcodeTextTranslations[languageSecondary] || ''
      customTextEn = barcodeTextTranslations.en || ''
    } else if (lang === 'en') {
      customTextEn = barcodeTextTranslations.en || ''
    } else {
      customTextSec = barcodeTextTranslations[languageSecondary] || ''
    }

    const TEXT_GAP_SEC = customTextSec ? 35 : 0
    const TEXT_GAP_EN = customTextEn ? 35 : 0
    const FOOTER_HEIGHT = 80 + TEXT_GAP_SEC + TEXT_GAP_EN

    canvas.width = QR_SIZE + PADDING * 2
    canvas.height = HEADER_HEIGHT + QR_SIZE + FOOTER_HEIGHT

    // Draw background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw QR Code
    await new Promise<void>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.05)'
        ctx.shadowBlur = 10
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(PADDING - 10, HEADER_HEIGHT - 10, QR_SIZE + 20, QR_SIZE + 20, 20)
        ctx.fill()
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
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const logoSize = QR_SIZE * 0.22
          const cx = PADDING + QR_SIZE / 2
          const cy = HEADER_HEIGHT + QR_SIZE / 2
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.roundRect(cx - logoSize / 2 - 6, cy - logoSize / 2 - 6, logoSize + 12, logoSize + 12, 12)
          ctx.fill()
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

    // 1. TOP TEXT (Only for "both" - show Secondary Custom Text)
    if (lang === 'both' && customTextSec) {
      ctx.font = '500 24px system-ui'
      ctx.fillStyle = '#6b7280'
      ctx.fillText(customTextSec, canvas.width / 2, currentY)
      currentY += 35
    }

    // 2. ROOM LABEL (Middle for "both", Top for single)
    ctx.font = 'bold 32px system-ui'
    ctx.fillStyle = '#111827'
    if (lang === 'both') {
      const roomTextSec = allDefaults[languageSecondary]?.room || tc('room')
      const roomTextEn = allDefaults['en']?.room || 'Room'
      ctx.fillText(`${roomTextSec} ${room.room_number} | ${roomTextEn} ${room.room_number}`, canvas.width / 2, currentY)
    } else {
      const roomText = lang === 'en' 
        ? `${allDefaults['en']?.room || 'Room'} ${room.room_number}` 
        : `${allDefaults[languageSecondary]?.room || tc('room')} ${room.room_number}`
      ctx.fillText(roomText, canvas.width / 2, currentY)
    }
    currentY += 40

    // 3. BOTTOM TEXT
    // - If "both": show English Custom Text
    // - If single: show its custom text
    const customTextToDraw = lang === 'both' ? customTextEn : (lang === 'en' ? customTextEn : customTextSec)
    if (customTextToDraw) {
      ctx.font = '500 24px system-ui'
      ctx.fillStyle = '#6b7280'
      ctx.fillText(customTextToDraw, canvas.width / 2, currentY)
    }

    return canvas
  }

  const handleDownloadQR = async (room: Room) => {
    setQrLoading(room.room_id)
    try {
      const canvas = await generateQRCanvas(room, qrLanguage)
      const canvasAspect = canvas.height / canvas.width
      const pdfWidth = qrSizeCm
      const pdfHeight = qrSizeCm * canvasAspect

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'cm',
        format: [pdfWidth, pdfHeight]
      })

      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`QR_Room_${room.room_number}_${qrLanguage}.pdf`)
    } catch (err) {
      console.error(err)
      toast.error(tc('error'))
    } finally {
      setQrLoading(null)
    }
  }

  const openBulkQRModal = () => {
    if (rooms.length === 0) return
    setSelectedRoom(rooms[0])
    setIsBulkQR(true)
  }

  const closeQRModal = () => {
    setSelectedQR(null)
    setSelectedRoom(null)
    setIsBulkQR(false)
  }

  const handleBulkDownloadQR = async () => {
    if (rooms.length === 0) return
    setBulkQrLoading(true)
    try {
      // Create first canvas just to get the aspect ratio needed for PDF creation
      const sampleCanvas = await generateQRCanvas(rooms[0], qrLanguage)
      const canvasAspect = sampleCanvas.height / sampleCanvas.width
      const pdfWidth = qrSizeCm
      const pdfHeight = qrSizeCm * canvasAspect

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'cm',
        format: [pdfWidth, pdfHeight]
      })

      for (let i = 0; i < rooms.length; i++) {
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight])
        }
        const canvas = await generateQRCanvas(rooms[i], qrLanguage)
        const imgData = canvas.toDataURL('image/png')
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }

      pdf.save(`All_Room_QRs_${qrLanguage}.pdf`)
      toast.success(tc('success'))
      closeQRModal()
    } catch (err) {
      console.error(err)
      toast.error(tc('error'))
    } finally {
      setBulkQrLoading(false)
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          {isRealtimeUpdating && (
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full animate-pulse border border-green-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Realtime</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isPrimarySupervisor && (
            <button
              onClick={() => setDeleteAllConfirmOpen(true)}
              disabled={rooms.length === 0}
              className="btn-ghost text-red-600 border border-red-200 hover:bg-red-50 gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('deleteAllBtn')}
            </button>
          )}
          <button 
            onClick={() => setBulkImportOpen(true)} 
            className="btn-secondary gap-2"
          >
            <Download className="h-4 w-4 rotate-180" />
            {t('importRoomsBtn')}
          </button>
          <button 
            onClick={openBulkQRModal} 
            disabled={bulkQrLoading || rooms.length === 0}
            className="btn-secondary gap-2"
          >
            <Download className="h-4 w-4" />
            {rooms.length === 0 ? t('noRooms') : t('exportAllPdf')}
          </button>
          <button onClick={openAdd} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            {t('addRoom')}
          </button>
        </div>
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

        {/* Unpaid Only Filter */}
        <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => {
          setUnpaidOnly(!unpaidOnly)
          setPage(1)
        }}>
          <input 
            type="checkbox" 
            checked={unpaidOnly} 
            onChange={() => {}} // handled by div click
            className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500" 
          />
          <span className="text-sm font-medium text-red-700 select-none">
            {t('roomsWithBalance') || 'Rooms with balance'}
          </span>
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
                <th>{t('sessionStatus')}</th>
                <th>{t('checkActions')}</th>
                <th>{t('balance')}</th>
                <th>{tc('actions')}</th>
                <th>{t('notes')}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.room_id}>
                  <td className="font-bold">{room.room_number}</td>
                  <td>{room.floor_number ?? tc('none')}</td>
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
                    {room.current_session && room.current_session.status === 'active' ? (
                      <span className="badge-active bg-red-100 text-red-800">{t('sessionActive')}</span>
                    ) : (
                      <span className="badge-inactive">{t('sessionCheckedOut')}</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {room.current_session && room.current_session.status === 'active' ? (
                        <>
                          <button
                            onClick={() => handleCheckOut(room)}
                            disabled={sessionLoading === room.room_id}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap"
                          >
                             {sessionLoading === room.room_id ? tc('loading') : t('checkOut')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSessionRoom(room)
                              setSessionModalOpen(true)
                            }}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap"
                          >
                             {t('sessionRecords')}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(room.room_id)}
                          disabled={sessionLoading === room.room_id}
                          className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap"
                        >
                           {sessionLoading === room.room_id ? tc('loading') : t('checkIn')}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="font-bold text-center">
                    {room.balance && room.balance > 0 ? (
                      <span className="text-red-600 underline cursor-pointer" onClick={() => {
                        setSelectedSessionRoom(room)
                        setSessionModalOpen(true)
                      }}>
                        {formatCurrency(room.balance, '', 'SAR')}
                      </span>
                    ) : (
                      <span className="text-green-600">0 SAR</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-1">
                      {room.qr_code ? (
                        <button
                          onClick={() => handleViewQR(room)}
                          className="btn-ghost p-2 text-primary-600"
                          title={t('viewQR')}
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGenerateQR(room.room_id)}
                          className="btn-ghost p-2 text-primary-600"
                          disabled={qrLoading === room.room_id}
                          title={t('generateQR')}
                        >
                          {qrLoading === room.room_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <QrCode className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      
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
                  <td className="max-w-[200px] truncate text-gray-500 whitespace-normal">
                    {room.notes || tc('none')}
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
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label={tc('pagination')}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-s-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">{tc('previous')}</span>
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
                  <span className="sr-only">{tc('next')}</span>
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
          onClick={closeQRModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl flex flex-col items-center max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {isBulkQR ? (
              <div className="flex flex-col items-center mb-6 w-full text-center">
                 <h3 className="text-xl font-bold text-gray-900 mb-1">{t('exportAllPdf')}</h3>
                 <p className="text-sm text-gray-500 mb-4">{t('bulkDownloadInfo', { count: rooms.length })}</p>
                 <div className="w-full flex justify-between items-center bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100">
                   <div className="flex items-center gap-2 font-medium">
                     <Info className="h-4 w-4" />
                     <span>{t('previewingFirstRoom')}</span>
                   </div>
                   <select
                     value={qrLanguage}
                     onChange={(e) => setQrLanguage(e.target.value)}
                     className="input py-1 px-3 text-sm !w-fit bg-white border-blue-200"
                   >
                     <option value="en">{tc('language_en')}</option>
                     {languageSecondary !== 'none' && (
                       <>
                         <option value={languageSecondary}>{tc(`language_${languageSecondary}` as any)}</option>
                         <option value="both">{t('qrLanguageBoth')}</option>
                       </>
                     )}
                   </select>
                 </div>
              </div>
            ) : (
                <div className="flex justify-between items-center w-full mb-6">
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('roomNumber')}: <span className="text-primary-600">{selectedRoom.room_number}</span>
                  </h3>
                  <select
                    value={qrLanguage}
                    onChange={(e) => setQrLanguage(e.target.value)}
                    className="input py-1 px-2 text-sm !w-fit min-w-[100px]"
                  >
                    <option value="en">{tc('language_en')}</option>
                    {languageSecondary !== 'none' && (
                      <>
                        <option value={languageSecondary}>{tc(`language_${languageSecondary}` as any)}</option>
                        <option value="both">{t('qrLanguageBoth')}</option>
                      </>
                    )}
                  </select>
                </div>
            )}

            {/* The beautiful card layout */}
            <div id="qr-card-preview" className="bg-white p-8 rounded-[2rem] border border-gray-100 flex flex-col items-center justify-center space-y-6 w-80 relative mb-6">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50/50 to-transparent rounded-t-[2rem]" />

              <div className="p-3 border border-gray-100/80 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative flex items-center justify-center">
                <Image src={selectedQR} alt={`QR code for room ${selectedRoom.room_number}`} width={192} height={192} />
                {hotelLogoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-xl shadow-sm flex items-center justify-center w-[22%] h-[22%]">
                      <Image src={hotelLogoUrl} alt="Hotel Logo" width={60} height={60} className="max-w-full max-h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 w-full pt-2">
                {/* For Dual Language: Secondary Text on Top */}
                {qrLanguage === 'both' && barcodeTextTranslations[languageSecondary] && (
                  <span
                    className="text-sm font-medium text-gray-500 text-center"
                    dir={languageSecondary === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {barcodeTextTranslations[languageSecondary]}
                  </span>
                )}

                {/* Middle (Both) or Top (Single): Room Label */}
                {qrLanguage === 'both' ? (
                  <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 leading-none py-1">
                    <span dir={languageSecondary === 'ar' ? 'rtl' : 'ltr'}>
                      {allDefaults[languageSecondary]?.room || tc('room')} {selectedRoom.room_number}
                    </span>
                    <span className="text-gray-300 font-light mx-1">|</span>
                    <span dir="ltr">
                      {allDefaults['en']?.room || 'Room'} {selectedRoom.room_number}
                    </span>
                  </div>
                ) : (
                  <p className="text-xl font-bold text-gray-900 text-center">
                    {qrLanguage === 'en' 
                      ? `${allDefaults['en']?.room || 'Room'} ${selectedRoom.room_number}` 
                      : `${allDefaults[languageSecondary]?.room || tc('room')} ${selectedRoom.room_number}`
                    }
                  </p>
                )}

                {/* Bottom: Custom Text (English for both/en, or Secondary for single secondary) */}
                {qrLanguage === 'both' ? (
                  barcodeTextTranslations.en && (
                    <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextTranslations.en}</span>
                  )
                ) : (
                  barcodeTextTranslations[qrLanguage] && (
                    <span
                      className="text-sm font-medium text-gray-500 text-center"
                      dir={qrLanguage === 'ar' ? 'rtl' : 'ltr'}
                    >
                      {barcodeTextTranslations[qrLanguage]}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* QR Setting Adjustments */}
            <div className="w-full mb-6 space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">{t('qrExportSize')}</label>
                  <div className="relative group">
                    <Info className="h-4 w-4 text-gray-400 hover:text-blue-500 transition-colors cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-80 flex-col items-center group-hover:flex z-10">
                      <div className="rounded bg-gray-900 p-3 text-xs text-white shadow-lg text-center space-y-2">
                        <p>{t('sizeHelpText')}</p>
                        <p className="text-yellow-200 font-medium">{t('printWarning')}</p>
                      </div>
                      <div className="h-2 w-2 -mt-1 rotate-45 bg-gray-900" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={qrSizeCm}
                    onChange={(e) => setQrSizeCm(Number(e.target.value))}
                    className="input py-1 px-3 w-40 text-sm font-medium"
                  >
                    {QR_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={closeQRModal}
                className="btn-secondary flex-1"
              >
                {tc('close')}
              </button>
              {isBulkQR ? (
                <button
                  onClick={handleBulkDownloadQR}
                  disabled={bulkQrLoading}
                  className="btn-primary flex-1 gap-2"
                >
                  {bulkQrLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t('downloadPdf')}
                </button>
              ) : (
                <button
                  onClick={() => handleDownloadQR(selectedRoom)}
                  disabled={qrLoading === selectedRoom?.room_id}
                  className="btn-primary flex-1 gap-2"
                >
                  {qrLoading === selectedRoom?.room_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {t('downloadPdf')}
                </button>
              )}
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

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={fetchRooms}
        roomTypes={roomTypes}
      />

       {/* Delete All Confirmation Modal */}
       {deleteAllConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="p-6">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t('deleteAllTitle')}
                </h3>
                <p className="text-sm text-red-600 font-medium mb-1">
                  {t('deleteAllDesc1')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('deleteAllDesc2')}
                </p>
              </div>
              <div className="mt-6 flex gap-3 w-full">
                <button
                  onClick={() => setDeleteAllConfirmOpen(false)}
                  disabled={deletingAll}
                  className="flex-1 btn-secondary py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 transition-all"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 bg-red-600 text-white rounded-xl py-2.5 font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-600 transition-all shadow-sm flex items-center justify-center"
                >
                  {deletingAll ? <Loader2 className="h-5 w-5 animate-spin" /> : t('yesDeleteAll')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SessionRecordsModal
        isOpen={sessionModalOpen}
        onClose={() => {
          setSessionModalOpen(false)
          setSelectedSessionRoom(null)
          fetchRooms()
        }}
        roomId={selectedSessionRoom?.room_id || null}
        roomNumber={selectedSessionRoom?.room_number}
      />

      {/* Success Alert Modal */}
      {successAlert && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8 border border-gray-100" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              successAlert.type === 'checkin' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
            }`}>
              {successAlert.type === 'checkin' ? <DoorOpen className="w-10 h-10" /> : <Info className="w-10 h-10" />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {successAlert.roomNumber} - {successAlert.title}
            </h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {successAlert.subtitle}
            </p>
            <button
              onClick={() => setSuccessAlert(null)}
              className="w-full btn-primary py-3 rounded-xl font-bold text-lg shadow-lg shadow-primary-600/20"
            >
              {tc('ok') || 'OK'}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Modal */}
      {checkoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
                <DoorOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {checkoutConfirm.room_number} - {t('confirmCheckOut')}
              </h3>
              <p className="text-gray-500 mb-8">
                {t('confirmCheckOutDesc') || 'Are you sure you want to checkout this room?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckoutConfirm(null)}
                  className="flex-1 btn-secondary py-3 rounded-xl font-medium border border-gray-200"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={() => handleCheckOut(checkoutConfirm, true)}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 font-bold hover:bg-red-700 shadow-lg shadow-red-600/20"
                >
                  {t('checkOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Orders Confirmation Modal */}
      {pendingOrdersConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mx-auto mb-6">
                <Info className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {pendingOrdersConfirm.room_number} - {t('hasPendingOrders')}
              </h3>
              <p className="text-gray-500 mb-8">
                {pendingOrdersConfirm.balance === 0 
                  ? t('completePendingPaidOrdersDesc') 
                  : t('confirmCancelPendingOrders')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingOrdersConfirm(null)}
                  className="flex-1 btn-secondary py-3 rounded-xl font-medium border border-gray-200"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={() => {
                    handleCheckOut(pendingOrdersConfirm, true)
                    setPendingOrdersConfirm(null)
                  }}
                  className={`flex-1 text-white rounded-xl py-3 font-bold shadow-lg ${
                    pendingOrdersConfirm.balance === 0 
                    ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" 
                    : "bg-yellow-600 hover:bg-yellow-700 shadow-yellow-600/20"
                  }`}
                >
                  {pendingOrdersConfirm.balance === 0 ? t('completeAndCheckOut') : t('cancelPendingThenCheckOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert Modal */}
      {errorAlert && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden text-center p-8 border border-red-100" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <div className="w-20 h-20 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-6">
              <Info className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {errorAlert.title}
            </h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              {errorAlert.subtitle}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setErrorAlert(null)
                  // Optionally open session modal if it's a balance error
                  if (errorAlert.subtitle === t('hasUnpaidBalance')) {
                     const room = rooms.find(r => r.room_number === errorAlert.roomNumber)
                     if (room) {
                        setSelectedSessionRoom(room)
                        setSessionModalOpen(true)
                     }
                  }
                }}
                className="w-full btn-primary py-3 rounded-xl font-bold text-lg shadow-lg shadow-primary-600/20"
              >
                {tc('ok') || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
