'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, Upload, ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { mainServiceSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { MainService } from '@/types'
import MultilingualInput from '@/components/MultilingualInput'
import { useHotel } from '@/components/Providers/HotelProvider'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'

interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  service?: MainService | null
}

interface FormData {
  serviceNameEn: string
  serviceNameSecondary: string
  descriptionEn?: string
  descriptionSecondary?: string
  availabilityType: '24/7' | 'scheduled'
  startTime?: string
  endTime?: string
  displayOrder: number
}

export default function ServiceFormModal({
  open,
  onClose,
  onSuccess,
  service,
}: ServiceFormModalProps) {
  const t = useTranslations('services')
  const tc = useTranslations('common')
  const [submitting, setSubmitting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [totalCount, setTotalCount] = useState(0)
  const { language_secondary: languageSecondary } = useHotel()

  // Initialize translations based on supported languages
  const initialTrans = Object.fromEntries(SUPPORTED_LANGUAGES.map(l => [l.code, '']))
  const [serviceNameTranslations, setServiceNameTranslations] = useState<Record<string, string>>(initialTrans)
  const [descriptionTranslations, setDescriptionTranslations] = useState<Record<string, string>>(initialTrans)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(mainServiceSchema),
    defaultValues: {
      serviceNameEn: '',
      serviceNameSecondary: '',
      descriptionEn: '',
      descriptionSecondary: '',
      availabilityType: '24/7',
      displayOrder: 1,
    },
  })

  const availabilityType = watch('availabilityType')
  const displayOrder = watch('displayOrder')

  // Fetch total services count when modal opens
  useEffect(() => {
    if (!open) return
    const fetchCountAndSettings = async () => {
      try {
        const servicesRes = await fetch('/api/services')

        const servicesData = await servicesRes.json()
        if (servicesData.success) {
          setTotalCount(servicesData.services?.length || 0)
        }
      } catch {
        // silently fail
      }
    }
    fetchCountAndSettings()
  }, [open])

  useEffect(() => {
    if (service) {
      const nameTrans = service.service_name || { ar: '', en: '' }
      const descTrans = service.description || { ar: '', en: '' }

      setServiceNameTranslations(nameTrans)
      setDescriptionTranslations(descTrans)

      reset({
        serviceNameEn: nameTrans.en || '',
        serviceNameSecondary: nameTrans[languageSecondary] || '',
        descriptionEn: descTrans.en || '',
        descriptionSecondary: descTrans[languageSecondary] || '',
        availabilityType: service.availability_type,
        startTime: service.start_time || '',
        endTime: service.end_time || '',
        displayOrder: service.display_order,
      })
      setImageUrl(service.image_url || null)
    } else {
      setServiceNameTranslations(initialTrans)
      setDescriptionTranslations(initialTrans)
      reset({
        serviceNameEn: '',
        serviceNameSecondary: '',
        descriptionEn: '',
        descriptionSecondary: '',
        availabilityType: '24/7',
        displayOrder: totalCount + 1,
      })
      setImageUrl(null)
    }
  }, [service, reset, open, totalCount, languageSecondary])

  // Clamp display_order in real-time
  useEffect(() => {
    const maxOrder = service ? totalCount : totalCount + 1
    if (maxOrder < 1) return
    if (displayOrder > maxOrder) {
      setValue('displayOrder', maxOrder)
    }
    if (displayOrder < 1) {
      setValue('displayOrder', 1)
    }
  }, [displayOrder, totalCount, service, setValue])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()

      if (result.success) {
        setImageUrl(result.url)
        toast.success(tc('success'))
      } else {
        toast.error(result.message || tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeImage = () => {
    setImageUrl(null)
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const url = service
        ? `/api/services/${service.service_id}`
        : '/api/services'
      const method = service ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          serviceName: serviceNameTranslations,
          description: descriptionTranslations,
          imageUrl: imageUrl || null,
        }),
      })

      const result = await res.json()

      if (result.success) {
        toast.success(tc('success'))
        onSuccess()
        onClose()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const maxOrder = service ? totalCount : totalCount + 1
  const isSingleItem = service && totalCount <= 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {service ? t('editService') : t('addService')}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Image Upload - First Field */}
          <div>
            <label className="label">
              {t('image')}
              <span className="text-gray-400 ms-1">({tc('optional')})</span>
            </label>
            <div className="mt-1 flex items-start gap-4">
              {imageUrl ? (
                <div className="relative inline-block">
                  <Image
                    src={imageUrl}
                    alt="Service"
                    width={200}
                    height={200}
                    className="h-40 w-40 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -end-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-500"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {t('uploadImage')}
                      </span>
                    </>
                  )}
                </button>
              )}
              <div className="text-xs text-gray-400 space-y-1 pt-1">
                <p>{tc('acceptedFormats')}: JPG, PNG, WebP, GIF</p>
                <p>{tc('maxFileSize')}: {tc('maxFileSizeValue')}</p>
                <p>{tc('recommendedSize')}: {tc('recommendedDimensions')}</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Service Name & Description */}
          <div className="space-y-6">
            <MultilingualInput
              label={t('serviceName')}
              translations={serviceNameTranslations}
              onChange={(val) => {
                setServiceNameTranslations(val)
                setValue('serviceNameEn', val.en)
                setValue('serviceNameSecondary', val[languageSecondary] || '')
              }}
              secondaryLocale={languageSecondary}
              availableLocales={SUPPORTED_LANGUAGES.map(l => l.code)}
              errorEn={errors.serviceNameEn?.message ? tc(errors.serviceNameEn.message) : undefined}
              errorSecondary={errors.serviceNameSecondary?.message ? tc(errors.serviceNameSecondary.message) : undefined}
            />

            <MultilingualInput
              label={t('description')}
              translations={descriptionTranslations}
              onChange={(val) => {
                setDescriptionTranslations(val)
                setValue('descriptionEn', val.en)
                setValue('descriptionSecondary', val[languageSecondary] || '')
              }}
              secondaryLocale={languageSecondary}
              availableLocales={SUPPORTED_LANGUAGES.map(l => l.code)}
              type="textarea"
              errorEn={errors.descriptionEn?.message ? tc(errors.descriptionEn.message) : undefined}
              errorSecondary={errors.descriptionSecondary?.message ? tc(errors.descriptionSecondary.message) : undefined}
            />
          </div>

          {/* Availability Type */}
          <div>
            <label className="label">{t('availability')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register('availabilityType')}
                  value="24/7"
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">{t('allDay')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register('availabilityType')}
                  value="scheduled"
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">{t('scheduled')}</span>
              </label>
            </div>
          </div>

          {/* Time Pickers (only when scheduled) */}
          {availabilityType === 'scheduled' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('startTime')}</label>
                <input
                  type="time"
                  {...register('startTime')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t('endTime')}</label>
                <input
                  type="time"
                  {...register('endTime')}
                  className="input"
                />
              </div>
            </div>
          )}

          {/* Display Order */}
          <div className="max-w-[200px]">
            <label className="label">{t('displayOrder')}</label>
            <input
              type="number"
              {...register('displayOrder', { valueAsNumber: true })}
              className="input"
              min={1}
              max={maxOrder}
            />
            <p className="mt-1 text-xs text-gray-400">
              {tc('maxValue')}: {maxOrder}
            </p>
            {isSingleItem && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{tc('singleItemOrder')}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <button type="button" onClick={onClose} className="btn-secondary">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tc('save')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

