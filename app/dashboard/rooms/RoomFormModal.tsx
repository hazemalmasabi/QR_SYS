'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Room, RoomType } from '@/types'

interface RoomFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room?: Room | null
  roomTypes: RoomType[]
}

interface FormData {
  roomNumber: string
  floorNumber: string
  roomType: string
  notes: string
}

interface FormErrors {
  roomNumber?: boolean
  roomType?: boolean
}

export default function RoomFormModal({
  isOpen,
  onClose,
  onSuccess,
  room,
  roomTypes,
}: RoomFormModalProps) {
  const t = useTranslations('rooms')
  const tc = useTranslations('common')
  const tv = useTranslations('validation')

  const [form, setForm] = useState<FormData>({
    roomNumber: '',
    floorNumber: '',
    roomType: '',
    notes: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (room) {
      setForm({
        roomNumber: room.room_number,
        floorNumber: room.floor_number?.toString() || '',
        roomType: room.room_type,
        notes: room.notes || '',
      })
    } else {
      setForm({ roomNumber: '', floorNumber: '', roomType: '', notes: '' })
    }
    setErrors({})
  }, [room, isOpen])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.roomNumber.trim()) {
      newErrors.roomNumber = true
    }
    if (!form.roomType) {
      newErrors.roomType = true
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        room_number: form.roomNumber.trim(),
        floor_number: form.floorNumber ? parseInt(form.floorNumber, 10) : null,
        room_type: form.roomType,
        notes: form.notes.trim() || null,
      }

      const url = room ? `/api/rooms/${room.room_id}` : '/api/rooms'
      const method = room ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else if (data.message === 'duplicateRoom') {
        setErrors({ roomNumber: true })
      }
    } catch {
      console.error('Room save error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col max-h-[90vh] rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {room ? t('editRoom') : t('addRoom')}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto min-h-0">
          {/* Room Number */}
          <div>
            <label className="label">{t('roomNumber')}</label>
            <input
              type="text"
              value={form.roomNumber}
              onChange={(e) => {
                setForm({ ...form, roomNumber: e.target.value })
                if (errors.roomNumber) setErrors({ ...errors, roomNumber: false })
              }}
              className={cn('input', errors.roomNumber && 'input-error')}
              maxLength={20}
            />
            {errors.roomNumber && (
              <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
            )}
          </div>

          {/* Floor Number */}
          <div>
            <label className="label">
              {t('floor')}{' '}
              <span className="text-gray-400">({tc('optional')})</span>
            </label>
            <input
              type="number"
              value={form.floorNumber}
              onChange={(e) => setForm({ ...form, floorNumber: e.target.value })}
              className="input"
              min={0}
              max={99}
            />
          </div>

          {/* Room Type */}
          <div>
            <label className="label">{t('roomType')}</label>
            <select
              value={form.roomType}
              onChange={(e) => {
                setForm({ ...form, roomType: e.target.value })
                if (errors.roomType) setErrors({ ...errors, roomType: false })
              }}
              className={cn('input', errors.roomType && 'input-error')}
            >
              <option value="">--</option>
              {roomTypes.map((rt) => (
                <option key={rt.code} value={rt.code}>
                  {rt.name_en} / {rt.name_ar}
                </option>
              ))}
            </select>
            {errors.roomType && (
              <p className="mt-1 text-xs text-red-500">{tv('required')}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">
              {t('notes')}{' '}
              <span className="text-gray-400">({tc('optional')})</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[80px] resize-y"
              maxLength={500}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              {tc('cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
