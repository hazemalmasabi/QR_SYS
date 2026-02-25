'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, Upload, ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { subServiceSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { SubService, MainService } from '@/types'

interface SubServiceFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  subService?: SubService | null
  services: MainService[]
}

interface FormData {
  parentServiceId: string
  subServiceNameAr: string
  subServiceNameEn: string
  descriptionAr?: string
  descriptionEn?: string
  availabilityType: 'always' | 'scheduled'
  startTime?: string
  endTime?: string
  displayOrder: number
}

export default function SubServiceFormModal({
  open,
  onClose,
  onSuccess,
  subService,
  services,
}: SubServiceFormModalProps) {
  const t = useTranslations('subServices')
  const ts = useTranslations('services')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [submitting, setSubmitting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [totalCount, setTotalCount] = useState(0)

  const getName = (name: { ar: string; en: string }) =>
    locale === 'ar' ? name.ar : name.en

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(subServiceSchema),
    defaultValues: {
      parentServiceId: '',
      subServiceNameAr: '',
      subServiceNameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      availabilityType: 'always',
      displayOrder: 1,
    },
  })

  const availabilityType = watch('availabilityType')
  const displayOrder = watch('displayOrder')
  const parentServiceId = watch('parentServiceId')

  // Fetch count of sub-services for the selected parent
  useEffect(() => {
    if (!open) return
    const fetchCount = async () => {
      try {
        const parentId = subService?.parent_service_id || parentServiceId
        if (!parentId) {
          setTotalCount(0)
          return
        }
        const res = await fetch(`/api/sub-services?parent_service_id=${parentId}`, {
          cache: 'no-store'
        })
        const data = await res.json()
        if (data.success) {
          setTotalCount(data.subServices?.length || 0)
        }
      } catch {
        // silently fail
      }
    }
    fetchCount()
  }, [open, parentServiceId, subService])

  useEffect(() => {
    if (subService) {
      reset({
        parentServiceId: subService.parent_service_id,
        subServiceNameAr: subService.sub_service_name.ar,
        subServiceNameEn: subService.sub_service_name.en,
        descriptionAr: subService.description?.ar || '',
        descriptionEn: subService.description?.en || '',
        availabilityType: subService.availability_type,
        startTime: subService.start_time || '',
        endTime: subService.end_time || '',
        displayOrder: subService.display_order,
      })
      setImageUrl(subService.image_url || null)
    } else {
      reset({
        parentServiceId: '',
        subServiceNameAr: '',
        subServiceNameEn: '',
        descriptionAr: '',
        descriptionEn: '',
        availabilityType: 'always',
        displayOrder: 1,
      })
      setImageUrl(null)
    }
  }, [subService, reset, open])

  // Update display_order when totalCount changes for new items
  useEffect(() => {
    if (!subService && open) {
      setValue('displayOrder', totalCount + 1)
    }
  }, [totalCount, subService, setValue, open])

  // Clamp display_order in real-time
  useEffect(() => {
    const maxOrder = subService ? totalCount : totalCount + 1
    if (maxOrder < 1) return
    if (displayOrder > maxOrder) {
      setValue('displayOrder', maxOrder)
    }
    if (displayOrder < 1) {
      setValue('displayOrder', 1)
    }
  }, [displayOrder, totalCount, subService, setValue])

  // Auto-select parentServiceId if there is only one available
  useEffect(() => {
    if (open && !subService && services.length === 1 && !parentServiceId) {
      setValue('parentServiceId', services[0].service_id, { shouldValidate: true })
    }
  }, [open, subService, services, parentServiceId, setValue])

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
      const url = subService
        ? `/api/sub-services/${subService.sub_service_id}`
        : '/api/sub-services'
      const method = subService ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
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

  const maxOrder = subService ? totalCount : totalCount + 1
  const isSingleItem = subService && totalCount <= 1

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
            {subService ? t('editSubService') : t('addSubService')}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Image Upload - First Field */}
          <div>
            <label className="label">
              {ts('image')}
              <span className="text-gray-400 ms-1">({tc('optional')})</span>
            </label>
            <div className="mt-1 flex items-start gap-4">
              {imageUrl ? (
                <div className="relative inline-block">
                  <Image
                    src={imageUrl}
                    alt="Sub-service"
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
                        {ts('uploadImage')}
                      </span>
                    </>
                  )}
                </button>
              )}
              <div className="text-xs text-gray-400 space-y-1 pt-1">
                <p>{tc('acceptedFormats')}: JPG, PNG, WebP, GIF</p>
                <p>{tc('maxFileSize')}: 5MB</p>
                <p>{tc('recommendedSize')}: 400×400px</p>
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

          {/* Parent Service */}
          <div>
            <label className="label">{t('parentService')}</label>
            <select
              {...register('parentServiceId')}
              className={cn('input', errors.parentServiceId && 'border-red-500')}
            >
              <option value="">--</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {getName(s.service_name)}
                </option>
              ))}
            </select>
            {errors.parentServiceId && (
              <p className="mt-1 text-xs text-red-500">
                {tc(errors.parentServiceId?.message || 'required')}
              </p>
            )}
          </div>

          {/* Sub Service Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('subServiceNameAr')}</label>
              <input
                {...register('subServiceNameAr')}
                className={cn('input', errors.subServiceNameAr && 'border-red-500')}
                dir="rtl"
              />
              {errors.subServiceNameAr && (
                <p className="mt-1 text-xs text-red-500">
                  {tc(errors.subServiceNameAr?.message || 'required')}
                </p>
              )}
            </div>
            <div>
              <label className="label">{t('subServiceNameEn')}</label>
              <input
                {...register('subServiceNameEn')}
                className={cn('input', errors.subServiceNameEn && 'border-red-500')}
                dir="ltr"
              />
              {errors.subServiceNameEn && (
                <p className="mt-1 text-xs text-red-500">
                  {tc(errors.subServiceNameEn?.message || 'required')}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                {t('descriptionAr')}
                <span className="text-gray-400 ms-1">({tc('optional')})</span>
              </label>
              <textarea
                {...register('descriptionAr')}
                className="input min-h-[80px] resize-y"
                dir="rtl"
                rows={3}
              />
            </div>
            <div>
              <label className="label">
                {t('descriptionEn')}
                <span className="text-gray-400 ms-1">({tc('optional')})</span>
              </label>
              <textarea
                {...register('descriptionEn')}
                className="input min-h-[80px] resize-y"
                dir="ltr"
                rows={3}
              />
            </div>
          </div>

          {/* Availability Type */}
          <div>
            <label className="label">{ts('availability')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register('availabilityType')}
                  value="always"
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">{ts('allDay')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  {...register('availabilityType')}
                  value="scheduled"
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-sm">{ts('scheduled')}</span>
              </label>
            </div>
          </div>

          {/* Time Pickers (only when scheduled) */}
          {availabilityType === 'scheduled' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{ts('startTime')}</label>
                <input
                  type="time"
                  {...register('startTime')}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{ts('endTime')}</label>
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
            <label className="label">{ts('displayOrder')}</label>
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
