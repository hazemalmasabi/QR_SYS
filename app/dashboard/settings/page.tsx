'use client'

import { useEffect, useState, useCallback } from 'react'

import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
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
  Check,
  Globe,
  Info,
  Hotel as HotelIcon,
  Coins,
  AlertTriangle,
  MapPin,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { cn, TIMEZONES, CURRENCIES } from '@/lib/utils'
import { SUPPORTED_LANGUAGES, getLanguageName } from '@/lib/languages'
import type { RoomType } from '@/types'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Clock } from '@/components/Clock'
import { useTranslationCounts } from '@/components/Providers/TranslationProvider'


import MultilingualInput from '@/components/MultilingualInput'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const tv = useTranslations('validation')
  const locale = useLocale()
  const { counts, refreshCounts } = useTranslationCounts()

  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, any>>({})

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
  const [hotelNameTranslations, setHotelNameTranslations] = useState<Record<string, string>>({})
  const [hotelLogoUrl, setHotelLogoUrl] = useState('')
  const [barcodeTextTranslations, setBarcodeTextTranslations] = useState<Record<string, string>>({})
  const [initialBarcodeText, setInitialBarcodeText] = useState<Record<string, string>>({})
  const [languageSecondary, setLanguageSecondary] = useState('ar')
  const [timezone, setTimezone] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [locationVerificationEnabled, setLocationVerificationEnabled] = useState(false)
  const [hotelGoogleMapsUrl, setHotelGoogleMapsUrl] = useState('')

  // Custom Timezone states
  const [customTzSign, setCustomTzSign] = useState<'+' | '-'>('+')
  const [customTzHours, setCustomTzHours] = useState('00')
  const [customTzMinutes, setCustomTzMinutes] = useState('00')
  const [isTimezoneVerified, setIsTimezoneVerified] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)
  const [matchingTimezones, setMatchingTimezones] = useState<{ value: string, label: any }[]>([])

  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [allDefaults, setAllDefaults] = useState<Record<string, { barcode: string, room: string }>>({})
  const [barcodePreviewLang, setBarcodePreviewLang] = useState<string>(locale === 'en' ? 'en' : (languageSecondary !== 'none' ? languageSecondary : 'en'))
  const [barcodePreviewDataUrl, setBarcodePreviewDataUrl] = useState<string | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [roomTypesErrors, setRoomTypesErrors] = useState<Array<{ code?: boolean, nameSec?: boolean, nameEn?: boolean }>>([])

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

  const getOffsetMinutes = (offsetStr: string) => {
    if (offsetStr === 'GMT' || offsetStr === 'UTC') return 0;
    const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10) || 0;
    const mins = parseInt(match[3], 10) || 0;
    return sign * (hours * 60 + mins);
  }

  const handleVerifyTimezone = () => {
    const userOffsetMinutes = ((customTzSign || '+') === '+' ? 1 : -1) * (parseInt(customTzHours || '00', 10) * 60 + parseInt(customTzMinutes || '00', 10))
    const matches = TIMEZONES.filter(tz => getOffsetMinutes(tz.offset) === userOffsetMinutes)

    setErrors(prev => ({ ...prev, timezone: false }))
    setIsTimezoneVerified(true)

    if (matches.length > 0) {
      setMatchingTimezones(matches)
      setVerificationMessage(t('matchingCountriesFound'))
    } else {
      setMatchingTimezones([])
      setVerificationMessage(t('noMatchingCountriesFound'))
    }
  }

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
        setHotelNameTranslations(data.settings.hotel_name_translations || { ar: data.settings.hotel_name || '', en: '' })
        setHotelLogoUrl(data.settings.hotel_logo_url || '')
        // Fetch default barcode texts from localization files
        let defaultBarcodeText: Record<string, string> = {}
        let defaultsData: any = {}
        try {
          const defaultsRes = await fetch('/api/translations/defaults')
          if (defaultsRes.ok) {
            defaultsData = await defaultsRes.json()
            setAllDefaults(defaultsData)
            Object.keys(defaultsData).forEach(lang => {
              defaultBarcodeText[lang] = defaultsData[lang].barcode
            })
          }
        } catch (error) {
          console.error('Failed to load default barcode translations', error)
        }

        const backendBarcodeText = data.settings.barcode_text_translations || {}
        const mergedBarcodeText: Record<string, string> = { ...defaultBarcodeText }
        for (const lang of Object.keys(backendBarcodeText)) {
          // If the backend has a non-empty string, use it. Otherwise, keep the default.
          if (backendBarcodeText[lang] && backendBarcodeText[lang].trim() !== '') {
            mergedBarcodeText[lang] = backendBarcodeText[lang]
          }
        }
        setBarcodeTextTranslations(mergedBarcodeText)
        setInitialBarcodeText(mergedBarcodeText)

        setLanguageSecondary(data.settings.language_secondary || 'ar')

        const tzValue = data.settings.timezone
        setTimezone(tzValue)

        // If the timezone is a custom GMT offset, try to parse it
        if (tzValue.startsWith('GMT') && tzValue.includes(':')) {
          const match = tzValue.match(/GMT([+-])(\d+):(\d+)/)
          if (match) {
            setCustomTzSign(match[1] as '+' | '-')
            setCustomTzHours(match[2].padStart(2, '0'))
            setCustomTzMinutes(match[3].padStart(2, '0'))
            setIsTimezoneVerified(true)
            setTimezone('OTHER')
          }
        }

        setCurrencyCode(data.settings.currency_code)
        setLocationVerificationEnabled(!!data.settings.location_verification_enabled)
        setHotelGoogleMapsUrl(data.settings.hotel_google_maps_url || '')
        const backendRoomTypes = data.settings.room_types || []
        const mergedRoomTypes = backendRoomTypes.map((rt: any) => {
          if (rt.code === 'STD') {
            const newName = { ...(rt.name || {}) }
            Object.keys(defaultsData).forEach(lang => {
              if (!newName[lang] || newName[lang].trim() === '') {
                newName[lang] = defaultsData[lang].roomType
              }
            })
            return { ...rt, name: newName }
          }
          return rt
        })

        setRoomTypes(mergedRoomTypes)
        refreshCounts()

        // Sync preview language once loaded
        const sec = data.settings.language_secondary || 'ar'
        if (sec !== 'none' && locale !== 'en') {
          setBarcodePreviewLang(sec)
        }
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
  }, [tc, refreshCounts, locale])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])


  const hasHotelChanges = settings ? (
    JSON.stringify(hotelNameTranslations) !== JSON.stringify(settings.hotel_name_translations || { ar: settings.hotel_name || '', en: '' }) ||
    timezone !== settings.timezone ||
    currencyCode !== settings.currency_code ||
    hotelLogoUrl !== (settings.hotel_logo_url || '') ||
    JSON.stringify(barcodeTextTranslations) !== JSON.stringify(initialBarcodeText) ||
    languageSecondary !== (settings.language_secondary || 'ar') ||
    locationVerificationEnabled !== (!!settings.location_verification_enabled) ||
    hotelGoogleMapsUrl !== (settings.hotel_google_maps_url || '')
  ) : false

  const handleCancelGeneral = () => {
    if (!settings) return;
    setHotelNameTranslations(settings.hotel_name_translations || { ar: settings.hotel_name || '', en: '' })
    setHotelLogoUrl(settings.hotel_logo_url || '')
    setBarcodeTextTranslations(initialBarcodeText)
    setLanguageSecondary(settings.language_secondary || 'ar')
    setTimezone(settings.timezone)
    setCurrencyCode(settings.currency_code)
    setLocationVerificationEnabled(!!settings.location_verification_enabled)
    setHotelGoogleMapsUrl(settings.hotel_google_maps_url || '')

    // Reset custom timezone states
    setCustomTzSign('+')
    setCustomTzHours('00')
    setCustomTzMinutes('00')
    setIsTimezoneVerified(false)
    setVerificationMessage(null)
    setMatchingTimezones([])

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

  const generateBarcodePreview = useCallback(async () => {
    try {
      if (Object.keys(allDefaults).length === 0) return;
      const url = new URL(`${window.location.origin}/guest/TEST-QR-ROOM-1`)
      url.searchParams.set('lang', barcodePreviewLang === 'both' ? (languageSecondary !== 'none' ? languageSecondary : 'en') : barcodePreviewLang)
      const qrDataUrl = await QRCode.toDataURL(url.toString(), { errorCorrectionLevel: 'H', width: 400, margin: 2 })
      setBarcodePreviewDataUrl(qrDataUrl)
    } catch (error) {
      console.error('Error generating QR preview:', error)
      toast.error(tc('error'))
    }
  }, [barcodePreviewLang, languageSecondary, allDefaults, tc])

  useEffect(() => {
    if (Object.keys(allDefaults).length > 0 && !barcodePreviewDataUrl && activeTab === 'hotel') {
      generateBarcodePreview()
    }
  }, [allDefaults, barcodePreviewDataUrl, generateBarcodePreview, activeTab])

  const addRoomType = () => {
    // Prevent adding multiple new rows before saving
    if (editingRow !== null) {
      toast.error(t('cancelEditFirst'))
      return
    }
    const newRoomType: RoomType = {
      code: '',
      name: {
        en: '',
        ...(languageSecondary !== 'none' ? { [languageSecondary]: '' } : {})
      }
    }
    setRoomTypes([...roomTypes, newRoomType])
    setEditingRow(roomTypes.length) // The new row is at the end of the array
    setEditedRoomType({ ...newRoomType })
  }

  const handleEditRow = (index: number) => {
    if (editingRow !== null) {
      toast.error(t('cancelEditFirst'))
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
    if (!roomTypes[index].original_code && !roomTypes[index].code) {
      setRoomTypes(roomTypes.filter((_, i) => i !== index))
    }
  }

  const updateEditedRoomType = (field: keyof RoomType, value: any) => {
    if (editedRoomType) {
      setEditedRoomType({ ...editedRoomType, [field]: value })
    }
  }

  const handleUpdateRowName = (lang: string, value: string) => {
    if (editedRoomType) {
      setEditedRoomType({
        ...editedRoomType,
        name: { ...(editedRoomType.name || {}), [lang]: value }
      })
    }
  }

  // Individual save method per row
  const saveRow = async (index: number) => {
    if (!editedRoomType) return;

    const secondaryLang = languageSecondary !== 'none' ? languageSecondary : 'ar'
    const hasErrorCode = !editedRoomType.code.trim()
    const hasErrorNameSec = languageSecondary !== 'none'
      ? !(editedRoomType.name?.[secondaryLang]?.trim())
      : false
    const hasErrorNameEn = !(editedRoomType.name?.en?.trim())

    if (hasErrorCode || hasErrorNameSec || hasErrorNameEn) {
      const newErrs = [...roomTypesErrors]
      newErrs[index] = {
        code: hasErrorCode,
        nameSec: hasErrorNameSec,
        nameEn: hasErrorNameEn
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
    // Fill legacy fields for backward compatibility safely
    const finalName = editedRoomType.name || {}
    updatedRoomTypes[index] = {
      ...editedRoomType,
      code: editedRoomType.code.trim().toUpperCase(),
      name: finalName
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
          name: rt.name
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
        refreshCounts()
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
      newErrors.email = tv('invalidEmail')
    }

    if (profilePassword) {
      // Basic check for complex password: min 8 length, 1 uppercase, 1 lowercase, 1 number, 1 special character
      if (profilePassword.length < 8) {
        newErrors.password = tv('passwordMin')
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])/.test(profilePassword)) {
        newErrors.password = tv('passwordRequirements')
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
          toast.info(t('emailChangeActivationSent'), { duration: 10000 })
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
      const newErrors: Record<string, any> = {}

      if (!hotelNameTranslations.en?.trim()) {
        const msg = tv('required')
        newErrors.hotelNameEn = msg
        toast.error(msg)
      } else if (hotelNameTranslations.en.trim().length < 3) {
        const msg = tv('minLength', { min: 3 })
        newErrors.hotelNameEn = msg
        toast.error(msg)
      }

      if (languageSecondary !== 'none') {
        if (!hotelNameTranslations[languageSecondary]?.trim()) {
          const msg = tv('required')
          newErrors.hotelNameSecondary = msg
          toast.error(msg)
        } else if (hotelNameTranslations[languageSecondary].trim().length < 3) {
          const msg = tv('minLength', { min: 3 })
          newErrors.hotelNameSecondary = msg
          toast.error(msg)
        }
      }

      if (locationVerificationEnabled) {
        if (!hotelGoogleMapsUrl?.trim()) {
          const msg = tv('required')
          newErrors.googleMapsUrl = msg
          toast.error(msg)
        } else if (!hotelGoogleMapsUrl.includes('google.com/maps') && !hotelGoogleMapsUrl.includes('maps.app.goo.gl')) {
          const msg = t('invalidGoogleMapsUrl')
          newErrors.googleMapsUrl = msg
          toast.error(msg)
        }
      }

      if (!timezone) newErrors.timezone = true
      if (!currencyCode) newErrors.currencyCode = true

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      setErrors({})

      const currency = CURRENCIES.find((c) => c.code === currencyCode)

      let finalTimezone = timezone
      if (finalTimezone === 'OTHER') {
        if (!isTimezoneVerified) {
          setErrors(prev => ({ ...prev, timezone: true }))
          toast.error(t('pleaseVerifyTimezoneFirst'))
          return
        }
        if (matchingTimezones.length > 0) {
          setErrors(prev => ({ ...prev, timezone: true }))
          toast.error(t('matchingCountriesSelectRequired'))
          return
        }
        finalTimezone = `GMT${customTzSign}${customTzHours}:${customTzMinutes}`
      }

      const cleanHotelNameTranslations: Record<string, string> = {
        ...(settings?.hotel_name_translations || {})
      }
      cleanHotelNameTranslations.en = hotelNameTranslations.en

      const cleanBarcodeTextTranslations: Record<string, string> = {
        ...(settings?.barcode_text_translations || {})
      }
      cleanBarcodeTextTranslations.en = barcodeTextTranslations.en || ''

      if (languageSecondary !== 'none') {
        cleanHotelNameTranslations[languageSecondary] = hotelNameTranslations[languageSecondary]
        cleanBarcodeTextTranslations[languageSecondary] = barcodeTextTranslations[languageSecondary] || ''
      }

      payload = {
        hotel_name_translations: cleanHotelNameTranslations,
        timezone: finalTimezone,
        currency_code: currencyCode,
        currency_symbol: currency?.symbol || (currencyCode === 'OTHER' ? '' : currencyCode),
        hotel_logo_url: hotelLogoUrl,
        barcode_text_translations: cleanBarcodeTextTranslations,
        language_secondary: languageSecondary,
        location_verification_enabled: locationVerificationEnabled,
        hotel_google_maps_url: locationVerificationEnabled ? (hotelGoogleMapsUrl || null) : null,
      }
      setSavingGeneral(true)
    } else if (type === 'room_types') {
      // Room Types Saving - Fallback implementation if global button is still used
      // For row-level saving, use saveRow()
      const newRoomTypesErrors = roomTypes.map((rt) => ({
        code: !rt.code.trim(),
        nameSec: languageSecondary !== 'none' ? !(rt.name?.[languageSecondary] || '').trim() : false,
        nameEn: !(rt.name?.en || '').trim(),
      }))

      const hasRoomTypeError = newRoomTypesErrors.some(
        (err) => err.code || err.nameSec || err.nameEn
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
        room_types: roomTypes.map((rt) => {
          const finalName = { ...(rt.name || {}) }
          finalName.en = (rt.name?.en || '').trim()
          if (languageSecondary !== 'none') {
            finalName[languageSecondary] = (rt.name?.[languageSecondary] || '').trim()
          }
          return {
            code: rt.code.trim().toUpperCase(),
            name: finalName
          }
        }),
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
        // Reload the page to reflect new logo/name in sidebar
        if (type === 'general') {
          let needsLocaleChange = false;
          let nextLocale = locale;

          if (locale !== 'en' && locale !== languageSecondary) {
            needsLocaleChange = true;
            nextLocale = languageSecondary === 'none' ? 'en' : languageSecondary;
          }

          if (needsLocaleChange) {
            await fetch('/api/set-locale', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ locale: nextLocale }),
            });
          }
          window.location.reload()
        }
        // reset mapping if room types save succeeded
        if (type === 'room_types') {
          setRoomTypeMappings([])
        }
      } else {
        toast.error(data.message === 'invalidGoogleMapsUrl' ? t('invalidGoogleMapsUrl') : tc('error'))
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
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
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
          {t('hotelInformation')}
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={cn(
            'pb-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'rooms'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {t('roomTypes')}
          {languageSecondary !== 'none' && counts.roomTypes > 0 && (
            <div className="group/tooltip relative flex items-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 cursor-help" />
              <div className="absolute bottom-full start-1/2 mb-2 hidden w-[200px] -translate-x-1/2 rounded bg-gray-900 px-2 py-1.5 text-center text-[10px] text-white opacity-0 transition-opacity group-hover/tooltip:block group-hover/tooltip:opacity-100 z-50 pointer-events-none shadow-lg font-normal leading-tight">
                {tc('missingTranslationTooltip', { language: tc(`language_${languageSecondary}` as any) })}
                <div className="absolute top-full start-1/2 -ml-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
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
          {t('personalData')}
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'hotel' && (
        <div className="card space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <HotelIcon className="h-5 w-5 text-primary-600" />
              {t('hotelInformation')}
            </h2>

            {/* Secondary Language Selection */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Globe className="h-4 w-4 text-gray-400" />
              <select
                value={languageSecondary}
                onChange={(e) => {
                  const val = e.target.value

                  if (languageSecondary !== 'none' && settings) {
                    setHotelNameTranslations(prev => ({
                      ...prev,
                      [languageSecondary]: settings.hotel_name_translations?.[languageSecondary] || ''
                    }))
                    setBarcodeTextTranslations(prev => ({
                      ...prev,
                      [languageSecondary]: settings.barcode_text_translations?.[languageSecondary] || ''
                    }))
                  }

                  setLanguageSecondary(val)
                }}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
              >
                <option value="none">{t('noSecondaryLanguage')}</option>
                {SUPPORTED_LANGUAGES.filter(lang => lang.code !== 'en').map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {getLanguageName(lang.code, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <MultilingualInput
              label={t('hotelName')}
              translations={hotelNameTranslations}
              onChange={(newVals) => {
                setHotelNameTranslations(newVals)
                if (errors.hotelNameEn || errors.hotelNameSecondary) {
                  setErrors(prev => ({ ...prev, hotelNameEn: null, hotelNameSecondary: null }))
                }
              }}
              secondaryLocale={languageSecondary === 'none' ? undefined : languageSecondary}
              availableLocales={languageSecondary === 'none' ? ['en'] : SUPPORTED_LANGUAGES.map(l => l.code)}
              errorEn={errors.hotelNameEn}
              errorSecondary={errors.hotelNameSecondary}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Timezone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="label mb-0">{t('timezone')}</label>
                  <Clock
                    timezone={timezone === 'OTHER' ? `GMT${customTzSign}${customTzHours}:${customTzMinutes}` : timezone}
                    className="!py-0.5 !px-2 !bg-primary-50 !border-primary-100 !shadow-none !rounded-md"
                    iconClassName="!w-3 !h-3"
                  />
                </div>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full mb-2 hidden w-64 rounded bg-gray-800 p-2 text-xs text-white group-hover:block z-50 ltr:right-0 rtl:left-0 shadow-lg border border-gray-700">
                    {t('timezoneInfoTooltip')}
                  </div>
                </div>
              </div>
              <div className="relative">
                <Globe className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-gray-400" />
                <SearchableSelect
                  options={TIMEZONES}
                  value={timezone}
                  onChange={(v) => {
                    setTimezone(v)
                    if (errors.timezone) setErrors({ ...errors, timezone: false })
                    if (v === 'OTHER') {
                      setIsTimezoneVerified(false)
                      setMatchingTimezones([])
                      setVerificationMessage(null)
                    }
                  }}
                  locale={locale}
                  placeholder={t('selectTimezonePlaceholder')}
                  searchPlaceholder={t('searchTimezonePlaceholder')}
                  noResultsText={t('noResults')}
                  error={!!errors.timezone}
                  hasIcon={true}
                  showOtherOption={true}
                  otherLabel={t('otherCustomOffset')}
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">{t('currency')}</label>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full mb-2 hidden w-64 rounded bg-gray-800 p-2 text-xs text-white group-hover:block z-50 ltr:right-0 rtl:left-0 shadow-lg border border-gray-700">
                    {t('currencyInfoTooltip')}
                  </div>
                </div>
              </div>
              <div className="relative">
                <Coins className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-gray-400" />
                <SearchableSelect
                  options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
                  value={currencyCode}
                  onChange={(v) => {
                    setCurrencyCode(v)
                    if (errors.currencyCode) setErrors({ ...errors, currencyCode: false })
                  }}
                  locale={locale}
                  placeholder={t('selectCurrencyPlaceholder')}
                  searchPlaceholder={t('searchCurrencyPlaceholder')}
                  noResultsText={t('noResults')}
                  error={!!errors.currencyCode}
                  hasIcon={true}
                  showOtherOption={true}
                  otherLabel={t('otherNoSymbol')}
                />
              </div>
            </div>

            {/* Custom Timezone Configuration - Spans both columns if OTHER is selected */}
            {timezone === 'OTHER' && (
              <div className="sm:col-span-2">
                <div className={cn(
                  "flex flex-col gap-3 p-4 rounded-lg border transition-all",
                  errors.timezone ? "border-red-300 bg-red-50/30 ring-1 ring-red-100" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-700">
                          {t('customGmtOffset')}
                        </span>
                        <span className="text-xs text-gray-500 font-medium leading-relaxed max-w-[200px]">
                          {t('setExactGmtOffset')}
                        </span>
                      </div>

                      <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto gap-1 sm:gap-2" dir="ltr">
                        <div className="flex items-center pb-2 shrink-0">
                          <span className="text-sm font-bold text-gray-400">GMT</span>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="text-[10px] text-center text-gray-500 font-medium">{t('sign')}</span>
                          <select
                            value={customTzSign}
                            className={cn(
                              "input py-2 px-0 text-sm text-center bg-white appearance-none w-[44px]",
                              (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                            )}
                            onChange={(e) => {
                              setCustomTzSign(e.target.value as '+' | '-');
                              setIsTimezoneVerified(false);
                              setVerificationMessage(null);
                              if (errors.timezone) setErrors(prev => ({ ...prev, timezone: false }));
                            }}
                          >
                            <option value="+">+</option>
                            <option value="-">-</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="text-[10px] text-center text-gray-500 font-medium">{t('hoursShort')}</span>
                          <select
                            value={customTzHours}
                            className={cn(
                              "input py-2 px-0 text-sm text-center bg-white appearance-none w-[60px]",
                              (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                            )}
                            onChange={(e) => {
                              setCustomTzHours(e.target.value);
                              setIsTimezoneVerified(false);
                              setVerificationMessage(null);
                              if (errors.timezone) setErrors(prev => ({ ...prev, timezone: false }));
                            }}
                          >
                            {Array.from({ length: 15 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col items-center justify-end pb-2 shrink-0">
                          <span className="font-bold text-gray-400">:</span>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <span className="text-[10px] text-center text-gray-500 font-medium">{t('minutesShort')}</span>
                          <select
                            value={customTzMinutes}
                            className={cn(
                              "input py-2 px-0 text-sm text-center bg-white appearance-none w-[60px]",
                              (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                            )}
                            onChange={(e) => {
                              setCustomTzMinutes(e.target.value);
                              setIsTimezoneVerified(false);
                              setVerificationMessage(null);
                              if (errors.timezone) setErrors(prev => ({ ...prev, timezone: false }));
                            }}
                          >
                            {['00', '15', '30', '45'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-gray-200 pt-3">
                      <button
                        type="button"
                        onClick={handleVerifyTimezone}
                        disabled={isTimezoneVerified}
                        className={cn(
                          "inline-flex shrink-0 w-full sm:w-auto items-center justify-center rounded-md text-sm font-medium border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all",
                          isTimezoneVerified
                            ? "bg-green-50 border-green-200 text-green-700 focus:ring-green-500"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                        )}
                      >
                        {isTimezoneVerified
                          ? t('verifiedSuccessfully')
                          : t('verifyTimezone')
                        }
                      </button>
                    </div>
                  </div>

                  {verificationMessage && (
                    <div className="mt-1 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-md">
                      {verificationMessage}
                    </div>
                  )}

                  {isTimezoneVerified && matchingTimezones.length > 0 && (
                    <div className="mt-1 pt-1">
                      <select
                        className={cn(
                          "input w-full bg-white text-sm",
                          errors.timezone ? "border-red-500 ring-1 ring-red-100" : "border-blue-400 ring-1 ring-blue-100"
                        )}
                        onChange={(e) => {
                          if (e.target.value) {
                            setTimezone(e.target.value)
                            setMatchingTimezones([])
                            setVerificationMessage(null)
                            if (errors.timezone) setErrors(prev => ({ ...prev, timezone: false }));
                          }
                        }}
                      >
                        <option value="">{t('selectMatchingCountryPlaceholder')}</option>
                        {matchingTimezones.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {typeof tz.label === 'string' ? tz.label : tz.label[locale as 'ar' | 'en']}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location Verification Section */}
          <div className="sm:col-span-2 mt-2">
            <div className={cn(
              "rounded-xl border p-4 transition-all",
              locationVerificationEnabled ? "border-primary-200 bg-primary-50/30" : "border-gray-200 bg-gray-50/30"
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    locationVerificationEnabled ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-400"
                  )}>
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t('locationVerification')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('locationVerificationDesc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationVerificationEnabled(v => !v)}
                  className="shrink-0 focus:outline-none"
                  title={locationVerificationEnabled ? tc('active') : tc('inactive')}
                >
                  {locationVerificationEnabled
                    ? <ToggleRight className="h-8 w-8 text-primary-600" />
                    : <ToggleLeft className="h-8 w-8 text-gray-400" />
                  }
                </button>
              </div>

              {locationVerificationEnabled && (
                <div className="mt-4 pt-4 border-t border-primary-100">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <MapPin className="h-4 w-4 shrink-0 text-primary-500" />
                    <span className="mt-0.5">{t('googleMapsUrl')}</span>
                  </label>
                  <input
                    type="url"
                    value={hotelGoogleMapsUrl}
                    onChange={(e) => setHotelGoogleMapsUrl(e.target.value)}
                    placeholder={t('googleMapsUrlPlaceholder')}
                    className={cn('input', errors.googleMapsUrl && 'input-error')}
                    dir="ltr"
                  />
                  {errors.googleMapsUrl && (
                    <p className="mt-1 text-xs text-red-500">{errors.googleMapsUrl}</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-500">{t('googleMapsUrlHint')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-6 border-t border-gray-100">
            <MultilingualInput
              label={t('barcodeTextOptional')}
              translations={barcodeTextTranslations}
              onChange={setBarcodeTextTranslations}
              secondaryLocale={languageSecondary}
              availableLocales={SUPPORTED_LANGUAGES.map(l => l.code)}
              maxLength={100}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="label">{t('hotelLogoOptional')}</label>
                <div className="flex items-center gap-4">
                  {hotelLogoUrl ? (
                    <div className="group relative h-24 w-24 rounded-xl border-2 border-primary-100 overflow-hidden bg-white hover:border-primary-300 transition-colors">
                      <Image src={hotelLogoUrl} alt="Hotel Logo" width={96} height={96} className="object-contain w-full h-full p-2" />
                      <button
                        onClick={() => setHotelLogoUrl('')}
                        className="absolute top-1 right-1 bg-white text-red-500 hover:text-red-700 rounded-full p-1 border shadow-sm transition-colors z-10 opacity-80 group-hover:opacity-100 hover:bg-red-50"
                        title={tc('remove')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer btn-secondary py-2 px-3 flex-shrink-0 text-xs">
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> : <Upload className="w-4 h-4 text-primary-600" />}
                    {t('uploadLogo')}
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
            </div>

            {/* Barcode Preview Action */}
            <div className="mt-6 p-5 rounded-xl border border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('testBarcodeLayout')}</h4>
                  <select
                    value={barcodePreviewLang}
                    onChange={(e) => setBarcodePreviewLang(e.target.value)}
                    className="input !w-fit min-w-[100px] py-1.5 text-sm"
                  >
                    <option value="en">{tc('language_en')}</option>
                    {languageSecondary !== 'none' && (
                      <>
                        <option value={languageSecondary}>{tc(`language_${languageSecondary}` as any)}</option>
                        <option value="both">{tc('all')}</option>
                      </>
                    )}
                  </select>
                  <button
                    onClick={generateBarcodePreview}
                    className="btn-secondary py-1.5 whitespace-nowrap"
                  >
                    {t('previewLayoutRoom1')}
                  </button>
                </div>
                <div className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 flex items-center gap-1">
                  <span className="font-semibold">{tc('note')}:</span>
                  {t('noteDesignPreviewOnly')}
                </div>
              </div>

              {barcodePreviewDataUrl && (
                <div className="mt-8 flex justify-center">
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center space-y-6 w-80 relative mb-6">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-blue-50/50 to-transparent rounded-t-[2rem]" />

                    <div className="p-3 border border-gray-100/80 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative flex items-center justify-center transition-transform hover:scale-105">
                      <Image src={barcodePreviewDataUrl} alt="QR Code Preview" width={192} height={192} className="w-48 h-48" />
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
                      {barcodePreviewLang === 'both' && barcodeTextTranslations[languageSecondary] && (
                        <span
                          className="text-sm font-medium text-gray-500 text-center"
                          dir={languageSecondary === 'ar' ? 'rtl' : 'ltr'}
                        >
                          {barcodeTextTranslations[languageSecondary]}
                        </span>
                      )}

                      {/* Middle (Both) or Top (Single): Room Label */}
                      {barcodePreviewLang === 'both' ? (
                        <div className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 leading-none py-1">
                          <span dir={languageSecondary === 'ar' ? 'rtl' : 'ltr'}>
                            {allDefaults[languageSecondary]?.room || tc('room')} 1
                          </span>
                          <span className="text-gray-300 font-light">|</span>
                          <span dir="ltr">
                            {allDefaults['en']?.room || 'Room'} 1
                          </span>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-gray-900 text-center">
                          {barcodePreviewLang === 'en' 
                            ? `${allDefaults['en']?.room || 'Room'} 1` 
                            : `${allDefaults[languageSecondary]?.room || tc('room')} 1`
                          }
                        </p>
                      )}

                      {/* Bottom: Custom Text (English for both/en, or Secondary for single secondary) */}
                      {barcodePreviewLang === 'both' ? (
                        barcodeTextTranslations.en && (
                          <span className="text-sm font-medium text-gray-500 text-center">{barcodeTextTranslations.en}</span>
                        )
                      ) : (
                        barcodeTextTranslations[barcodePreviewLang] && (
                          <span
                            className="text-sm font-medium text-gray-500 text-center"
                            dir={barcodePreviewLang === 'ar' ? 'rtl' : 'ltr'}
                          >
                            {barcodeTextTranslations[barcodePreviewLang]}
                          </span>
                        )
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
              <div className={cn(
                "hidden gap-3 sm:grid px-3 items-center",
                languageSecondary === 'none' ? "sm:grid-cols-[1fr_2fr_150px_auto]" : "sm:grid-cols-[1fr_2fr_2fr_150px_auto]"
              )}>
                <span className="text-xs font-medium text-gray-500">
                  {t('typeCode')}
                </span>
                {languageSecondary !== 'none' && (
                  <span className="text-xs font-medium text-gray-500">
                    {tc('nameIn', { language: tc(`language_${languageSecondary}` as any) })}
                  </span>
                )}
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
                      "grid grid-cols-1 gap-3 rounded-lg border p-4 sm:items-center sm:p-3 transition-colors",
                      languageSecondary === 'none' ? "sm:grid-cols-[1fr_2fr_150px_auto]" : "sm:grid-cols-[1fr_2fr_2fr_150px_auto]",
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
                            placeholder={t('typeCode')}
                            maxLength={10}
                          />
                          {roomTypesErrors[index]?.code && (
                            <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
                          )}
                        </div>
                        {languageSecondary !== 'none' && (
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">
                              {tc('nameIn', { language: tc(`language_${languageSecondary}` as any) })}
                            </label>
                            <input
                              type="text"
                              value={currentData.name?.[languageSecondary] || ''}
                              onChange={(e) => {
                                handleUpdateRowName(languageSecondary, e.target.value)
                                if (roomTypesErrors[index]?.nameSec) {
                                  const newErrs = [...roomTypesErrors]
                                  newErrs[index] = { ...newErrs[index], nameSec: false }
                                  setRoomTypesErrors(newErrs)
                                }
                              }}
                              className={cn('input', roomTypesErrors[index]?.nameSec && 'input-error')}
                              placeholder={languageSecondary !== 'none' ? tc('standard') : ''}
                              maxLength={50}
                            />
                            {roomTypesErrors[index]?.nameSec && (
                              <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameEn')}</label>
                          <input
                            type="text"
                            value={currentData.name?.en ?? ''}
                            onChange={(e) => {
                              handleUpdateRowName('en', e.target.value)
                              if (roomTypesErrors[index]?.nameEn) {
                                const newErrs = [...roomTypesErrors]
                                newErrs[index] = { ...newErrs[index], nameEn: false }
                                setRoomTypesErrors(newErrs)
                              }
                            }}
                            className={cn('input', roomTypesErrors[index]?.nameEn && 'input-error')}
                            placeholder={tc('standard')}
                            maxLength={50}
                          />
                          {roomTypesErrors[index]?.nameEn && (
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
                        {languageSecondary !== 'none' && (
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">
                              {tc('nameIn', { language: tc(`language_${languageSecondary}` as any) })}
                            </label>
                            <span className="block text-sm text-gray-700 sm:py-2">
                              <div className="flex items-center gap-2">
                                <span>
                                  {rt.name?.[languageSecondary]?.trim() ? (
                                    rt.name[languageSecondary]
                                  ) : (
                                    <span className="text-gray-400 italic">{tc('notTranslated')}</span>
                                  )}
                                </span>
                                {!rt.name?.[languageSecondary]?.trim() && (
                                  <div className="group/tooltip relative flex items-center">
                                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 cursor-help" />
                                    <div className="absolute bottom-full start-1/2 mb-2 hidden w-[200px] -translate-x-1/2 rounded bg-gray-900 px-2 py-1.5 text-center text-xs text-white opacity-0 transition-opacity group-hover/tooltip:block group-hover/tooltip:opacity-100 z-50 pointer-events-none shadow-lg font-normal">
                                      {tc('missingTranslationTooltip', { language: tc(`language_${languageSecondary}` as any) })}
                                      <div className="absolute top-full start-1/2 -ml-1 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </span>
                          </div>
                        )}
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700 sm:hidden">{t('typeNameEn')}</label>
                          <span className="block text-sm text-gray-700 sm:py-2">{rt.name?.en}</span>
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
                {t('fullName')}
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
                {tc('email')}
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
                {t('newPassword')}
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
                  placeholder={t('passwordLeaveEmpty')}
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
                  <p className="font-medium text-gray-700">{tc('passwordRequirements')}:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2">
                      {passwordCriteria.length ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.length ? "text-green-700" : "text-gray-500"}>
                        {tc('passwordMinLength')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.uppercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.uppercase ? "text-green-700" : "text-gray-500"}>
                        {tc('passwordUppercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.lowercase ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.lowercase ? "text-green-700" : "text-gray-500"}>
                        {tc('passwordLowercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.number ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.number ? "text-green-700" : "text-gray-500"}>
                        {tc('passwordNumber')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordCriteria.special ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                      <span className={passwordCriteria.special ? "text-green-700" : "text-gray-500"}>
                        {tc('passwordSpecial')}
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
                  {t('saving')}
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
                          {rt.name?.en} / {rt.name?.[languageSecondary]} ({rt.code})
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
                    {t('emailChangeConfirmTitle')}
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
                    {t('emailChangeValidRequired')}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-gray-400 shrink-0" />
                  <span>
                    {t('emailChangeActivationSent')}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="h-5 w-5 text-gray-400 shrink-0" />
                  <span>
                    {t('emailChangeCheckSpam')}
                  </span>
                </li>
                <li className="flex gap-3">
                  <X className="h-5 w-5 text-red-400 shrink-0" />
                  <span className="text-red-700 font-medium">
                    {t('emailChangeCriticalWarning')}
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
                {tc('cancel')}
              </button>
              <button
                onClick={executeSaveProfile}
                className="btn-primary"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    {t('emailChangeConfirming')}
                  </>
                ) : (
                  t('emailChangeConfirmButton')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}
