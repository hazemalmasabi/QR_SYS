'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Settings,
  User,
  Mail,
  Lock,
  Edit2,
  X,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Check
} from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { cn, TIMEZONES, CURRENCIES } from '@/lib/utils'
import type { RoomType } from '@/types'

interface SettingsData {
  hotel_name: string
  hotel_name_en?: string
  hotel_logo_url?: string
  barcode_text_ar?: string
  barcode_text_en?: string
  timezone: string
  currency_code: string
  currency_symbol: string
  room_types: RoomType[]
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const tv = useTranslations('validation')
  const locale = useLocale()

  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Tabs state
  const [activeTab, setActiveTab] = useState<'hotel' | 'rooms' | 'profile'>('hotel')

  // Profile Form state
  const [originalProfile, setOriginalProfile] = useState<{ full_name: string, email: string } | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profilePassword, setProfilePassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  // Password criteria checks
  const passwordCriteria = {
    length: profilePassword.length >= 8,
    uppercase: /[A-Z]/.test(profilePassword),
    lowercase: /[a-z]/.test(profilePassword),
    number: /\d/.test(profilePassword),
    special: /[\W_]/.test(profilePassword),
  }

  // Form state
  const [hotelName, setHotelName] = useState('')
  const [hotelNameEn, setHotelNameEn] = useState('')
  const [hotelLogoUrl, setHotelLogoUrl] = useState('')
  const [barcodeTextAr, setBarcodeTextAr] = useState('')
  const [barcodeTextEn, setBarcodeTextEn] = useState('')
  const [timezone, setTimezone] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')

  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [barcodePreviewLang, setBarcodePreviewLang] = useState<'ar' | 'en' | 'both'>(locale as 'ar' | 'en' | 'both')
  const [barcodePreviewDataUrl, setBarcodePreviewDataUrl] = useState<string | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [roomTypesErrors, setRoomTypesErrors] = useState<Array<{ code?: boolean, name_ar?: boolean, name_en?: boolean }>>([])

  // Which row is currently being edited. If null, none. If 'new', it's a completely new row.
  const [editingRow, setEditingRow] = useState<number | 'new' | null>(null)

  // Temporary state for the row being edited before saving
  const [editedRoomType, setEditedRoomType] = useState<RoomType | null>(null)

  // Save states
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingRooms, setSavingRooms] = useState(false)

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<number | null>(null)
  const [replacementType, setReplacementType] = useState('')
  const [roomTypeMappings, setRoomTypeMappings] = useState<{ oldCode: string, newCode: string }[]>([])

  // Email Change Confirmation Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const [resSettings, resProfile] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/profile')
      ])

      const data = await resSettings.json()
      if (data.success) {
        setSettings(data.settings)
        setHotelName(data.settings.hotel_name)
        setHotelNameEn(data.settings.hotel_name_en || '')
        setHotelLogoUrl(data.settings.hotel_logo_url || '')
        setBarcodeTextAr(data.settings.barcode_text_ar || '')
        setBarcodeTextEn(data.settings.barcode_text_en || '')
        setTimezone(data.settings.timezone)
        setCurrencyCode(data.settings.currency_code)
        setRoomTypes(data.settings.room_types || [])
      }

      const dataProfile = await resProfile.json()
      if (dataProfile.success) {
        setProfileName(dataProfile.profile.full_name || '')
        setProfileEmail(dataProfile.profile.email || '')
        setOriginalProfile({
          full_name: dataProfile.profile.full_name || '',
          email: dataProfile.profile.email || ''
        })
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [tc])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code)
  }

  const hasHotelChanges = settings ? (
    hotelName !== settings.hotel_name ||
    hotelNameEn !== (settings.hotel_name_en || '') ||
    timezone !== settings.timezone ||
    currencyCode !== settings.currency_code ||
    hotelLogoUrl !== (settings.hotel_logo_url || '') ||
    barcodeTextAr !== (settings.barcode_text_ar || '') ||
    barcodeTextEn !== (settings.barcode_text_en || '')
  ) : false

  const handleCancelGeneral = () => {
    if (!settings) return;
    setHotelName(settings.hotel_name)
    setHotelNameEn(settings.hotel_name_en || '')
    setHotelLogoUrl(settings.hotel_logo_url || '')
    setBarcodeTextAr(settings.barcode_text_ar || '')
    setBarcodeTextEn(settings.barcode_text_en || '')
    setTimezone(settings.timezone)
    setCurrencyCode(settings.currency_code)
    setErrors({})
    setBarcodePreviewDataUrl(null)
  }

  const hasProfileChanges = originalProfile ? (
    profileName.trim() !== originalProfile.full_name ||
    profileEmail.trim() !== originalProfile.email ||
    profilePassword !== ''
  ) : false

  const handleCancelProfile = () => {
    if (!originalProfile) return;
    setProfileName(originalProfile.full_name)
    setProfileEmail(originalProfile.email)
    setProfilePassword('')
    setProfileErrors({})
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setHotelLogoUrl(data.url)
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const generateBarcodePreview = async () => {
    try {
      // Simulate URL for room 1 (for testing purposes only)
      const url = new URL(`${window.location.origin}/guest/TEST-QR-ROOM-1`)
      url.searchParams.set('lang', barcodePreviewLang === 'both' ? 'ar' : barcodePreviewLang)
      const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })
      setBarcodePreviewDataUrl(qrDataUrl)
    } catch (error) {
      console.error('Error generating QR preview:', error)
      toast.error(tc('error'))
    }
  }

  const addRoomType = () => {
    // Prevent adding multiple new rows before saving
    if (editingRow !== null) {
      toast.error('الرجاء حفظ أو إلغاء التعديل الحالي أولاً')
      return
    }
    const newRoomType = { code: '', name_ar: '', name_en: '' }
    setRoomTypes([...roomTypes, newRoomType])
    setEditingRow(roomTypes.length) // The new row is at the end of the array
    setEditedRoomType({ ...newRoomType })
  }

  const handleEditRow = (index: number) => {
    if (editingRow !== null) {
      toast.error('الرجاء حفظ أو إلغاء التعديل الحالي أولاً')
      return
    }
    setEditingRow(index)
    setEditedRoomType({ ...roomTypes[index] })

    // Clear any previous errors for this row
    if (roomTypesErrors[index]) {
      const newErrs = [...roomTypesErrors]
      newErrs[index] = {}
      setRoomTypesErrors(newErrs)
    }
  }

  const handleCancelEdit = (index: number) => {
    setEditingRow(null)
    setEditedRoomType(null)

    // Clear errors
    if (roomTypesErrors[index]) {
      const newErrs = [...roomTypesErrors]
      newErrs[index] = {}
      setRoomTypesErrors(newErrs)
    }

    // If it was a newly added row and never saved, remove it from the array
    if (!roomTypes[index].original_code && !roomTypes[index].code && !roomTypes[index].name_ar && !roomTypes[index].name_en) {
      setRoomTypes(roomTypes.filter((_, i) => i !== index))
    }
  }

  const updateEditedRoomType = (field: keyof RoomType, value: string) => {
    if (editedRoomType) {
      setEditedRoomType({ ...editedRoomType, [field]: value })
    }
  }

  // Individual save method per row
  const saveRow = async (index: number) => {
    if (!editedRoomType) return;

    // Validate
    const hasErrorCode = !editedRoomType.code.trim()
    const hasErrorNameAr = !editedRoomType.name_ar.trim()
    const hasErrorNameEn = !editedRoomType.name_en.trim()

    if (hasErrorCode || hasErrorNameAr || hasErrorNameEn) {
      const newErrs = [...roomTypesErrors]
      newErrs[index] = {
        code: hasErrorCode,
        name_ar: hasErrorNameAr,
        name_en: hasErrorNameEn
      }
      setRoomTypesErrors(newErrs)
      toast.error(tv('required'))
      return
    }

    // Check for duplicate room type codes (excluding itself)
    const otherCodes = roomTypes
      .filter((_, i) => i !== index)
      .map(rt => rt.code.trim().toUpperCase())

    if (otherCodes.includes(editedRoomType.code.trim().toUpperCase())) {
      toast.error(t('codeExists'))
      return
    }

    // Add mapping check BEFORE locally saving
    let newMappings = [...roomTypeMappings]
    const originalCode = roomTypes[index].original_code
    if (originalCode && editedRoomType.code.trim().toUpperCase() !== originalCode.trim().toUpperCase()) {
      newMappings.push({
        oldCode: originalCode.trim().toUpperCase(),
        newCode: editedRoomType.code.trim().toUpperCase()
      })
    }

    // Save locally first
    const updatedRoomTypes = [...roomTypes]
    updatedRoomTypes[index] = {
      ...editedRoomType,
      code: editedRoomType.code.trim().toUpperCase(),
      name_ar: editedRoomType.name_ar.trim(),
      name_en: editedRoomType.name_en.trim()
    }

    setRoomTypes(updatedRoomTypes)
    setEditingRow(null)
    setEditedRoomType(null)

    // Immediately push to backend for specific room type list
    setSavingRooms(true)
    try {
      const payload = {
        room_types: updatedRoomTypes.map((rt) => ({
          code: rt.code.trim().toUpperCase(),
          name_ar: rt.name_ar.trim(),
          name_en: rt.name_en.trim(),
        })),
        room_type_mappings: newMappings
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        setSettings(data.settings)
        setRoomTypeMappings([]) // reset mappings
      } else {
        toast.error(tc('error'))
        // Revert local state on backend failure
        setRoomTypes(roomTypes)
      }
    } catch {
      toast.error(tc('error'))
      setRoomTypes(roomTypes)
    } finally {
      setSavingRooms(false)
    }
  }

  const updateRoomType = (index: number, field: keyof RoomType, value: string) => {
    // Keep this only for legacy/general updates if still needed, but primarily use updateEditedRoomType
    const updated = [...roomTypes]
    updated[index] = { ...updated[index], [field]: value }
    setRoomTypes(updated)
  }

  const handleDeleteClick = (index: number) => {
    if (roomTypes.length <= 1) {
      toast.error(t('mustKeepOneRoomType'))
      return
    }

    const typeToDelete = roomTypes[index]
    if (!typeToDelete.original_code) {
      // Unsaved room type, delete immediately without confirmation
      setRoomTypes(roomTypes.filter((_, i) => i !== index))
      if (roomTypesErrors.length > 0) {
        setRoomTypesErrors(roomTypesErrors.filter((_, i) => i !== index))
      }
      return
    }

    setRoomTypeToDelete(index)
    setReplacementType('')
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (roomTypeToDelete === null || !replacementType) {
      toast.error(t('mustSelectReplacement'))
      return
    }

    const typeToDelete = roomTypes[roomTypeToDelete]

    // Only add to mapping if it was an existing type (has an original code, or simply we track all mappings)
    // Actually the server will need the current code (before deletion) to move the rooms
    const mapping = {
      oldCode: typeToDelete.code.trim().toUpperCase(),
      newCode: replacementType
    }

    setRoomTypeMappings((prev) => [...prev, mapping])
    setRoomTypes(roomTypes.filter((_, i) => i !== roomTypeToDelete))
    setIsDeleteModalOpen(false)
    setRoomTypeToDelete(null)
    setReplacementType('')
  }

  const handleSaveProfile = async () => {
    const newErrors: Record<string, string> = {}

    if (!profileName.trim()) {
      newErrors.name = tv('required')
    }

    if (!profileEmail.trim()) {
      newErrors.email = tv('required')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
      newErrors.email = tv('invalidEmail') || (locale === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format')
    }

    if (profilePassword) {
      // Basic check for complex password: min 8 length, 1 uppercase, 1 lowercase, 1 number, 1 special character
      if (profilePassword.length < 8) {
        newErrors.password = locale === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 8 أحرف' : 'Password must be at least 8 characters'
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/.test(profilePassword)) {
        newErrors.password = locale === 'ar' ? 'كلمة المرور يجب أن تحتوي على حرف كبير، حرف صغير، رقم، ورمز' : 'Password must contain uppercase, lowercase, number, and special character'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setProfileErrors(newErrors)
      toast.error(tc('error'))
      return
    }

    setProfileErrors({})

    // If email is changed, ask for confirmation first
    if (originalProfile && profileEmail.trim() !== originalProfile.email) {
      setIsEmailModalOpen(true)
      return
    }

    // Otherwise proceed to save
    await executeSaveProfile()
  }

  const executeSaveProfile = async () => {
    setIsEmailModalOpen(false)
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileName.trim(),
          email: profileEmail.trim(),
          password: profilePassword ? profilePassword : undefined,
          lang: locale
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        setProfilePassword('')
        if (data.emailChanged) {
          toast.info(locale === 'ar' ? 'تم تغيير البريد الإلكتروني. يرجى تأكيد البريد الجديد لتتمكن من تسجيل الدخول.' : 'Email changed. Please verify your new email to login later.', { duration: 10000 })
          setTimeout(() => {
            window.location.href = '/login'
          }, 3000)
        } else {
          // Update original profile state so cancel button disappears
          setOriginalProfile({
            full_name: profileName.trim(),
            email: profileEmail.trim()
          })
        }
      } else {
        if (data.message === 'emailTaken') {
          toast.error(tv('emailTaken') || tc('error'))
        } else {
          toast.error(tc('error'))
        }
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSave = async (type: 'general' | 'room_types') => {
    let payload: any = {}

    if (type === 'general') {
      const newErrors: Record<string, boolean> = {}

      if (!hotelName.trim()) newErrors.hotelName = true
      if (!hotelNameEn.trim()) newErrors.hotelNameEn = true
      if (!timezone) newErrors.timezone = true
      if (!currencyCode) newErrors.currencyCode = true

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      setErrors({})

      const currency = CURRENCIES.find((c) => c.code === currencyCode)
      payload = {
        hotel_name: hotelName.trim(),
        hotel_name_en: hotelNameEn.trim(),
        timezone,
        currency_code: currencyCode,
        currency_symbol: currency?.symbol || currencyCode,
        hotel_logo_url: hotelLogoUrl,
        barcode_text_ar: barcodeTextAr.trim(),
        barcode_text_en: barcodeTextEn.trim(),
      }
      setSavingGeneral(true)
    } else if (type === 'room_types') {
      // Room Types Saving - Fallback implementation if global button is still used
      // For row-level saving, use saveRow()
      const newRoomTypesErrors = roomTypes.map((rt) => ({
        code: !rt.code.trim(),
        name_ar: !rt.name_ar.trim(),
        name_en: !rt.name_en.trim(),
      }))

      const hasRoomTypeError = newRoomTypesErrors.some(
        (err) => err.code || err.name_ar || err.name_en
      )

      if (hasRoomTypeError) {
        setRoomTypesErrors(newRoomTypesErrors)
        toast.error(tv('required'))
        return
      }

      setRoomTypesErrors([])

      // Check for duplicate room type codes
      const codes = roomTypes.map((rt) => rt.code.trim().toUpperCase())
      if (new Set(codes).size !== codes.length) {
        toast.error(tc('error'))
        return
      }

      if (roomTypes.length === 0) {
        toast.error(t('mustKeepOneRoomType'))
        return
      }

      payload = {
        room_types: roomTypes.map((rt) => ({
          code: rt.code.trim().toUpperCase(),
          name_ar: rt.name_ar.trim(),
          name_en: rt.name_en.trim(),
        })),
        room_type_mappings: roomTypeMappings // send mapping array to backend
      }
      setSavingRooms(true)
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        setSettings(data.settings)
        // reset mapping if room types save succeeded
        if (type === 'room_types') {
          setRoomTypeMappings([])
        }
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      if (type === 'general') setSavingGeneral(false)
      else setSavingRooms(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Settings className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium">{tc('error')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{locale === 'ar' ? 'الإعدادات' : 'Settings'}</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 space-x-reverse border-b border-gray-200">
        <button
          onClick={() => setActiveTab('hotel')}
          className={cn(
            'pb-4 px-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'hotel'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {locale === 'ar' ? 'بيانات الفندق' : 'Hotel Data'}
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={cn(
            'pb-4 px-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'rooms'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {t('roomTypes')}
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={cn(
            'pb-4 px-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {locale === 'ar' ? 'البيانات الشخصية' : 'Personal Data'}
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'hotel' && (
        <div className="card space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Hotel Name */}
            <div>
              <label className="label">{t('hotelName')}</label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => {
                  setHotelName(e.target.value)
                  if (errors.hotelName) setErrors({ ...errors, hotelName: false })
                }}
                className={cn('input', errors.hotelName && 'input-error')}
                maxLength={100}
              />
              {errors.hotelName && <p className="mt-1 text-xs text-red-500">{tv('required')}</p>}
            </div>

            {/* Hotel Name EN */}
            <div>
              <label className="label">Hotel Name (English)</label>
              <input
                type="text"
                dir="ltr"
                value={hotelNameEn}
                onChange={(e) => {
                  setHotelNameEn(e.target.value)
                  if (errors.hotelNameEn) setErrors({ ...errors, hotelNameEn: false })
                }}
                className={cn('input', errors.hotelNameEn && 'input-error')}
                maxLength={100}
              />
              {errors.hotelNameEn && <p className="mt-1 text-xs text-red-500">{tv('required')}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Timezone */}
            <div>
              <label className="label">{t('timezone')}</label>
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value)
                  if (errors.timezone) setErrors({ ...errors, timezone: false })
                }}
                className={cn('input', errors.timezone && 'input-error')}
              >
                <option value="">---</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {locale === 'ar' ? tz.label.ar : tz.label.en} ({tz.value})
                  </option>
                ))}
              </select>
              {errors.timezone && <p className="mt-1 text-xs text-red-500">{tv('required')}</p>}
            </div>

            {/* Currency */}
            <div>
              <label className="label">{t('currency')}</label>
              <select
                value={currencyCode}
                onChange={(e) => {
                  handleCurrencyChange(e.target.value)
                  if (errors.currencyCode) setErrors({ ...errors, currencyCode: false })
                }}
                className={cn('input', errors.currencyCode && 'input-error')}
              >
                <option value="">---</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {locale === 'ar' ? c.label.ar : c.label.en} ({c.symbol})
                  </option>
                ))}
              </select>
              {errors.currencyCode && <p className="mt-1 text-xs text-red-500">{tv('required')}</p>}
            </div>
          </div>

          {/* Barcode & Logo Settings */}
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-md font-semibold text-gray-900 mb-4">{locale === 'ar' ? 'عرض الباركود (اختياري)' : 'Barcode Display (Optional)'}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="label">{locale === 'ar' ? 'شعار الفندق' : 'Hotel Logo'}</label>
                <div className="flex items-center gap-4">
                  {hotelLogoUrl ? (
                    <div className="relative h-16 w-16 rounded-xl border border-gray-200 overflow-hidden bg-white">
                      <img src={hotelLogoUrl} alt="Logo" className="object-contain w-full h-full p-2" />
                      <button
                        onClick={() => setHotelLogoUrl('')}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border-2 border-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer btn-secondary py-2 px-3 flex-shrink-0">
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {locale === 'ar' ? 'رفع شعار' : 'Upload Logo'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                  </label>
                </div>
              </div>

              {/* Barcode Text AR */}
              <div>
                <label className="label">{locale === 'ar' ? 'نص الباركود (عربي)' : 'Barcode Text (Arabic)'}</label>
                <input
                  type="text"
                  value={barcodeTextAr}
                  onChange={(e) => setBarcodeTextAr(e.target.value)}
                  className="input"
                  placeholder={locale === 'ar' ? 'مثال: امسح الباركود للطلب' : 'e.g., Scan to order'}
                  maxLength={100}
                />
              </div>

              {/* Barcode Text EN */}
              <div>
                <label className="label">{locale === 'ar' ? 'نص الباركود (إنجليزي)' : 'Barcode Text (English)'}</label>
                <input
                  type="text"
                  dir="ltr"
                  value={barcodeTextEn}
                  onChange={(e) => setBarcodeTextEn(e.target.value)}
                  className="input"
                  placeholder="e.g., Scan to order"
                  maxLength={100}
                />
              </div>
            </div>

            {/* Barcode Preview Action */}
            <div className="mt-6 p-5 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-medium text-gray-700 whitespace-nowrap">{locale === 'ar' ? 'تجربة شكل الباركود:' : 'Test Barcode Layout:'}</h4>
                  <select
                    value={barcodePreviewLang}
                    onChange={(e) => setBarcodePreviewLang(e.target.value as 'ar' | 'en' | 'both')}
                    className="input !w-fit min-w-[100px] py-1.5 text-sm"
                  >
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                    <option value="both">كلاهما / Both</option>
                  </select>
                  <button
                    onClick={generateBarcodePreview}
                    className="btn-secondary py-1.5 whitespace-nowrap"
                  >
                    {locale === 'ar' ? 'تجربة شكل العرض لغرفة 1' : 'Preview Layout (Room 1)'}
                  </button>
                </div>
                <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 flex items-center gap-1">
                  <span className="font-semibold">{locale === 'ar' ? 'تنبيه:' : 'Note:'}</span>
                  {locale === 'ar' ? 'هذا عرض تجريبي فقط للتصميم ولن يعمل للمسح.' : 'This is a design preview only and will not scan.'}
                </div>
              </div>

              {barcodePreviewDataUrl && (
                <div className="mt-8 flex justify-center">
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center space-y-6 w-80 relative mb-6">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50/50 to-transparent rounded-t-[2rem]" />

                    <div className="p-3 border border-gray-100/80 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative flex items-center justify-center transition-transform hover:scale-105">
                      <img src={barcodePreviewDataUrl} alt="QR Code Preview" className="w-48 h-48" />
                      {hotelLogoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white p-1 rounded-xl shadow-sm flex items-center justify-center w-[22%] h-[22%]">
                            <img src={hotelLogoUrl} alt="Hotel Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-2 w-full pt-2">
                      {(barcodePreviewLang === 'ar' || barcodePreviewLang === 'both') && barcodeTextAr && (
                        <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextAr}</span>
                      )}

                      {barcodePreviewLang === 'both' ? (
                        <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 leading-none py-1">
                          <span dir="rtl">غرفة 1</span>
                          <span className="text-gray-300 font-light">|</span>
                          <span dir="ltr">Room 1</span>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-gray-900 text-center">
                          {barcodePreviewLang === 'ar' ? 'غرفة 1' : 'Room 1'}
                        </p>
                      )}

                      {(barcodePreviewLang === 'en' || barcodePreviewLang === 'both') && barcodeTextEn && (
                        <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextEn}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {hasHotelChanges && (
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={handleCancelGeneral}
                className="btn-ghost"
                disabled={savingGeneral}
              >
                {tc('cancel')}
              </button>
              <button
                onClick={() => handleSave('general')}
                className="btn-primary"
                disabled={savingGeneral}
              >
                {savingGeneral ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('saveGeneralSettings')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Room Types */}
      {activeTab === 'rooms' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('roomTypes')}
            </h2>
          </div>

          {roomTypes.length === 0 ? (
            <p className="py-8 text-center text-gray-400">{tc('noData')}</p>
          ) : (
            <div className="space-y-3">
              <div className="hidden grid-cols-[1fr_2fr_2fr_150px_auto] gap-3 sm:grid px-3 items-center">
                <span className="text-xs font-medium text-gray-500">
                  {t('typeCode')}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {t('typeNameAr')}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {t('typeNameEn')}
                </span>
                <span className="text-xs font-medium text-gray-500 justify-self-center">
                  {t('roomsCount')}
                </span>
                <span className="w-16" /> {/* Space for actions */}
              </div>

              {roomTypes.map((rt, index) => {
                const isEditing = editingRow === index
                const currentData = isEditing && editedRoomType ? editedRoomType : rt

                return (
                  <div
                    key={index}
                    className={cn(
                      "grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_2fr_2fr_150px_auto] sm:items-center sm:p-3 transition-colors",
                      isEditing ? "border-primary-200 bg-primary-50/30" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {isEditing ? (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeCode')}</label>
                          <input
                            type="text"
                            value={currentData.code}
                            onChange={(e) => {
                              updateEditedRoomType('code', e.target.value)
                              if (roomTypesErrors[index]?.code) {
                                const newErrs = [...roomTypesErrors]
                                newErrs[index] = { ...newErrs[index], code: false }
                                setRoomTypesErrors(newErrs)
                              }
                            }}
                            className={cn('input', roomTypesErrors[index]?.code && 'input-error')}
                            placeholder="STD"
                            maxLength={10}
                          />
                          {roomTypesErrors[index]?.code && (
                            <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameAr')}</label>
                          <input
                            type="text"
                            value={currentData.name_ar}
                            onChange={(e) => {
                              updateEditedRoomType('name_ar', e.target.value)
                              if (roomTypesErrors[index]?.name_ar) {
                                const newErrs = [...roomTypesErrors]
                                newErrs[index] = { ...newErrs[index], name_ar: false }
                                setRoomTypesErrors(newErrs)
                              }
                            }}
                            className={cn('input', roomTypesErrors[index]?.name_ar && 'input-error')}
                            placeholder="عادية"
                            maxLength={50}
                          />
                          {roomTypesErrors[index]?.name_ar && (
                            <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameEn')}</label>
                          <input
                            type="text"
                            value={currentData.name_en}
                            onChange={(e) => {
                              updateEditedRoomType('name_en', e.target.value)
                              if (roomTypesErrors[index]?.name_en) {
                                const newErrs = [...roomTypesErrors]
                                newErrs[index] = { ...newErrs[index], name_en: false }
                                setRoomTypesErrors(newErrs)
                              }
                            }}
                            className={cn('input', roomTypesErrors[index]?.name_en && 'input-error')}
                            placeholder="Standard"
                            maxLength={50}
                          />
                          {roomTypesErrors[index]?.name_en && (
                            <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeCode')}</label>
                          <span className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{rt.code}</span>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameAr')}</label>
                          <span className="block text-sm text-gray-700 sm:py-2">{rt.name_ar}</span>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameEn')}</label>
                          <span className="block text-sm text-gray-700 sm:py-2">{rt.name_en}</span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-self-center">
                      <label className="mr-2 block text-sm font-medium text-gray-700 sm:hidden">{t('roomsCount')}</label>
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                        {rt.rooms_count || 0}
                      </span>
                    </div>

                    <div className="flex sm:mt-0 mt-2 sm:h-10 sm:items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleCancelEdit(index)}
                            className="btn-ghost p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            title={tc('cancel')}
                            disabled={savingRooms}
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => saveRow(index)}
                            className="btn-ghost p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg"
                            title={tc('save')}
                            disabled={savingRooms}
                          >
                            {savingRooms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditRow(index)}
                            className="btn-ghost p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title={tc('edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(index)}
                            className="btn-ghost p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title={tc('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={addRoomType}
              className="btn-primary w-full sm:w-auto flex items-center justify-center"
            >
              <Plus className="h-4 w-4 ml-2" />
              {t('addRoomType')}
            </button>
          </div>
        </div>
      )}

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="card space-y-5 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                <User className="w-4 h-4 ml-1.5 inline-block text-gray-400" />
                {locale === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value)
                  if (profileErrors.name) setProfileErrors({ ...profileErrors, name: '' })
                }}
                className={cn("input", profileErrors.name && "input-error")}
              />
              {profileErrors.name && <p className="mt-1 text-xs text-red-500">{profileErrors.name}</p>}
            </div>
            <div>
              <label className="label">
                <Mail className="w-4 h-4 ml-1.5 inline-block text-gray-400" />
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => {
                  setProfileEmail(e.target.value)
                  if (profileErrors.email) setProfileErrors({ ...profileErrors, email: '' })
                }}
                className={cn("input", profileErrors.email && "input-error")}
                dir="ltr"
              />
              {profileErrors.email && <p className="mt-1 text-xs text-red-500 text-start" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{profileErrors.email}</p>}
            </div>
            <div>
              <label className="label">
                <Lock className="w-4 h-4 ml-1.5 inline-block text-gray-400" />
                {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={profilePassword}
                  onChange={(e) => {
                    setProfilePassword(e.target.value)
                    if (profileErrors.password) setProfileErrors({ ...profileErrors, password: '' })
                  }}
                  className={cn("input", locale === 'ar' ? "pl-10 text-left" : "pr-10", profileErrors.password && "input-error")}
                  placeholder={locale === 'ar' ? 'اتركه فارغاً إذا لم ترغب بالتغيير' : 'Leave empty to keep current'}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={cn("absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none", locale === 'ar' ? 'left-3' : 'right-3')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {profilePassword.length > 0 && (
                <div className="mt-3 space-y-2 text-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  <p className="font-medium text-gray-700">{locale === 'ar' ? 'شروط كلمة المرور:' : 'Password requirements:'}</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      {passwordCriteria.length ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.length ? "text-green-700" : "text-gray-500"}>
                        {locale === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.uppercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.uppercase ? "text-green-700" : "text-gray-500"}>
                        {locale === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least 1 uppercase letter'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.lowercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.lowercase ? "text-green-700" : "text-gray-500"}>
                        {locale === 'ar' ? 'حرف صغير واحد على الأقل' : 'At least 1 lowercase letter'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.number ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.number ? "text-green-700" : "text-gray-500"}>
                        {locale === 'ar' ? 'رقم واحد على الأقل' : 'At least 1 number'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.special ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.special ? "text-green-700" : "text-gray-500"}>
                        {locale === 'ar' ? 'رمز واحد على الأقل (مثل @، #، !)' : 'At least 1 special character'}
                      </span>
                    </li>
                  </ul>
                </div>
              )}
              {profileErrors.password && <p className="mt-1 text-xs text-red-500 text-start" dir={locale === 'ar' ? 'rtl' : 'ltr'}>{profileErrors.password}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            {hasProfileChanges && (
              <button
                onClick={handleCancelProfile}
                className="btn-ghost"
                disabled={savingProfile}
              >
                {tc('cancel')}
              </button>
            )}
            <button
              onClick={handleSaveProfile}
              className="btn-primary w-full sm:w-auto"
              disabled={savingProfile || !hasProfileChanges}
            >
              {savingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4 inline" />
                  {tc('save')}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Delete Room Type Modal */}
      {
        isDeleteModalOpen && roomTypeToDelete !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('deleteRoomType')}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {t('deleteRoomTypeConfirm')}
                </p>

                <div className="space-y-3">
                  <label className="label">{t('replacementType')}</label>
                  <select
                    className="input"
                    value={replacementType}
                    onChange={(e) => setReplacementType(e.target.value)}
                  >
                    <option value="">--</option>
                    {roomTypes
                      .filter((_, i) => i !== roomTypeToDelete) // Exclude the one being deleted
                      .filter((rt) => rt.code.trim() !== '') // Must be a valid existing code
                      .map((rt) => (
                        <option key={rt.code} value={rt.code}>
                          {rt.name_en} / {rt.name_ar} ({rt.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="btn-secondary"
                >
                  {tc('cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  disabled={!replacementType} // Force selecting a replacement
                >
                  {tc('delete')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Email Change Confirmation Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-yellow-50 p-6 border-b border-yellow-100">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
                  <Mail className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {locale === 'ar' ? 'تأكيد تغيير البريد الإلكتروني' : 'Confirm Email Change'}
                  </h3>
                  <p className="mt-1 text-sm text-yellow-800 font-medium">
                    {profileEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-gray-400 shrink-0" />
                  <span>
                    {locale === 'ar'
                      ? 'يجب أن يكون البريد الإلكتروني الجديد صحيحاً ومتاحاً للوصول.'
                      : 'The new email address must be valid and accessible.'}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-gray-400 shrink-0" />
                  <span>
                    {locale === 'ar'
                      ? 'سيتم إرسال رسالة تفعيل إلى هذا البريد وتحتوي على رابط تأكيد.'
                      : 'An activation email containing a confirmation link will be sent.'}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-gray-400 shrink-0" />
                  <span>
                    {locale === 'ar'
                      ? 'قد تجد رسالة التأكيد في صندوق البريد المهمل (Spam / Junk).'
                      : 'You might find the confirmation email in your Spam or Junk folder.'}
                  </span>
                </li>
                <li className="flex gap-3">
                  <X className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-red-700 font-medium">
                    {locale === 'ar'
                      ? 'لن تتمكن من تسجيل الدخول إلى النظام أبداً إذا لم تقم بتأكيد البريد الجديد.'
                      : 'You will NOT be able to log in to the system if you do not confirm the new email.'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="btn-secondary"
                disabled={savingProfile}
              >
                {locale === 'ar' ? 'تراجع' : 'Cancel'}
              </button>
              <button
                onClick={executeSaveProfile}
                className="btn-primary"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    {locale === 'ar' ? 'جاري التأكيد...' : 'Confirming...'}
                  </>
                ) : (
                  locale === 'ar' ? 'نعم، قم بتغيير البريد' : 'Yes, change email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}
