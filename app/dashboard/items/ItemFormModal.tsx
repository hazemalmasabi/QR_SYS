'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, Upload, ImageIcon, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { itemSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import type { Item, MainService, SubService } from '@/types'

interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  item?: Item | null
  services: MainService[]
}

interface FormData {
  subServiceId: string
  itemNameAr: string
  itemNameEn: string
  descriptionAr?: string
  descriptionEn?: string
  isFree: boolean
  price: number
  displayOrder: number
}

export default function ItemFormModal({
  open,
  onClose,
  onSuccess,
  item,
  services,
}: ItemFormModalProps) {
  const t = useTranslations('items')
  const ts = useTranslations('services')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [submitting, setSubmitting] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [subServices, setSubServices] = useState<SubService[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [totalCount, setTotalCount] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      subServiceId: '',
      itemNameAr: '',
      itemNameEn: '',
      descriptionAr: '',
      descriptionEn: '',
      isFree: false,
      price: '' as unknown as number,
      displayOrder: 1,
    },
  })

  const displayOrder = watch('displayOrder')
  const subServiceId = watch('subServiceId')
  const isFree = watch('isFree')

  const getName = (name: { ar: string; en: string }) =>
    locale === 'ar' ? name.ar : name.en

  const fetchSubServices = useCallback(async (serviceId: string) => {
    if (!serviceId) {
      setSubServices([])
      return
    }
    setLoadingSubs(true)
    try {
      const res = await fetch(
        `/api/sub-services?parent_service_id=${serviceId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (data.success) {
        setSubServices(data.subServices)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSubs(false)
    }
  }, [])

  // Fetch count of items for the selected sub-service
  useEffect(() => {
    if (!open) return
    const fetchCount = async () => {
      try {
        const sid = item?.sub_service_id || subServiceId
        if (!sid) {
          setTotalCount(0)
          return
        }
        const res = await fetch(`/api/items?sub_service_id=${sid}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.success) {
          setTotalCount(data.items?.length || 0)
        }
      } catch {
        // silently fail
      }
    }
    fetchCount()
  }, [open, subServiceId, item])

  useEffect(() => {
    if (!open) return

    if (item) {
      reset({
        subServiceId: item.sub_service_id,
        itemNameAr: item.item_name.ar,
        itemNameEn: item.item_name.en,
        descriptionAr: item.description?.ar || '',
        descriptionEn: item.description?.en || '',
        isFree: item.is_free || false,
        price: item.price,
        displayOrder: item.display_order || 1,
      })
      setImageUrl(item.image_url || null)

      // Find the parent service for this item's sub-service
      const findParent = async () => {
        try {
          const res = await fetch(`/api/sub-services`, { cache: 'no-store' })
          const data = await res.json()
          if (data.success) {
            const sub = data.subServices.find(
              (s: SubService) => s.sub_service_id === item.sub_service_id
            )
            if (sub) {
              setSelectedServiceId(sub.parent_service_id)
              await fetchSubServices(sub.parent_service_id)
            }
          }
        } catch {
          // silently fail
        }
      }
      findParent()
    } else {
      reset({
        subServiceId: '',
        itemNameAr: '',
        itemNameEn: '',
        descriptionAr: '',
        descriptionEn: '',
        isFree: false,
        price: '' as unknown as number,
        displayOrder: 1,
      })
      setSelectedServiceId('')
      setSubServices([])
      setImageUrl(null)
    }
  }, [item, reset, open, fetchSubServices])

  // Auto-select Main Service if there is only one available
  useEffect(() => {
    if (open && !item && services.length === 1 && !selectedServiceId) {
      setSelectedServiceId(services[0].service_id)
      fetchSubServices(services[0].service_id)
    }
  }, [open, item, services, selectedServiceId, fetchSubServices])

  // Auto-select Sub Service if there is only one available
  useEffect(() => {
    if (open && !item && selectedServiceId && subServices.length === 1 && !subServiceId) {
      setValue('subServiceId', subServices[0].sub_service_id, { shouldValidate: true })
    }
  }, [open, item, selectedServiceId, subServices, subServiceId, setValue])

  // Update display_order when totalCount changes for new items
  useEffect(() => {
    if (!item && open) {
      setValue('displayOrder', totalCount + 1)
    }
  }, [totalCount, item, setValue, open])

  useEffect(() => {
    if (selectedServiceId && !item) {
      fetchSubServices(selectedServiceId)
      setValue('subServiceId', '')
    }
  }, [selectedServiceId, fetchSubServices, setValue, item])

  // When isFree changes, handle price
  useEffect(() => {
    if (isFree) {
      setValue('price', 0, { shouldValidate: true })
    } else {
      const currentPrice = watch('price')
      if (currentPrice === 0) {
        setValue('price', '' as unknown as number) // Clear it visually so user must type
      }
    }
  }, [isFree, setValue, watch])

  // Clamp display_order in real-time
  useEffect(() => {
    const maxOrder = item ? totalCount : totalCount + 1
    if (maxOrder < 1) return
    if (displayOrder > maxOrder) {
      setValue('displayOrder', maxOrder)
    }
    if (displayOrder < 1) {
      setValue('displayOrder', 1)
    }
  }, [displayOrder, totalCount, item, setValue])

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
      const url = item ? `/api/items/${item.item_id}` : '/api/items'
      const method = item ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: data.isFree ? 0 : data.price,
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

  const maxOrder = item ? totalCount : totalCount + 1
  const isSingleItem = item && totalCount <= 1

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
            {item ? t('editItem') : t('addItem')}
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
                    alt="Item"
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

          {/* Service Selector (for filtering sub-services) */}
          <div>
            <label className="label">{t('service')}</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="input"
            >
              <option value="">--</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {getName(s.service_name)}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-service Selector */}
          <div>
            <label className="label">{t('subService')}</label>
            {loadingSubs ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tc('loading')}
              </div>
            ) : (
              <select
                {...register('subServiceId')}
                className={cn('input', errors.subServiceId && 'border-red-500')}
                disabled={!selectedServiceId}
              >
                <option value="">--</option>
                {subServices.map((sub) => (
                  <option key={sub.sub_service_id} value={sub.sub_service_id}>
                    {getName(sub.sub_service_name)}
                  </option>
                ))}
              </select>
            )}
            {errors.subServiceId && (
              <p className="mt-1 text-xs text-red-500">
                {tc(errors.subServiceId?.message || 'required')}
              </p>
            )}
          </div>

          {/* Item Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('itemNameAr')}</label>
              <input
                {...register('itemNameAr')}
                className={cn('input', errors.itemNameAr && 'border-red-500')}
                dir="rtl"
              />
              {errors.itemNameAr && (
                <p className="mt-1 text-xs text-red-500">
                  {tc(errors.itemNameAr?.message || 'required')}
                </p>
              )}
            </div>
            <div>
              <label className="label">{t('itemNameEn')}</label>
              <input
                {...register('itemNameEn')}
                className={cn('input', errors.itemNameEn && 'border-red-500')}
                dir="ltr"
              />
              {errors.itemNameEn && (
                <p className="mt-1 text-xs text-red-500">
                  {tc(errors.itemNameEn?.message || 'required')}
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

          {/* Free checkbox + Price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('price')}</label>
              <input
                type="number"
                step="0.01"
                {...register('price', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const val = e.target.value;
                    if (!isFree && (val === '0' || val === '0.0' || val === '0.00')) {
                      e.target.value = '';
                      setValue('price', '' as unknown as number, { shouldValidate: true });
                    }
                  }
                })}
                className={cn('input', errors.price && 'border-red-500', isFree && 'opacity-50 cursor-not-allowed')}
                min={isFree ? 0 : 0.01}
                disabled={isFree}
                placeholder={isFree ? "0" : ""}
              />
              {errors.price && !isFree && (
                <p className="mt-1 text-xs text-red-500">{t('priceRequired')}</p>
              )}
              {/* Free checkbox */}
              <label className="mt-3 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isFree')}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-green-600">{t('free')}</span>
              </label>
            </div>
            <div>
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
