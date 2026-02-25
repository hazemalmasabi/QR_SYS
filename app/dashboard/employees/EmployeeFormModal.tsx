'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Employee, MainService, SessionPayload } from '@/types'

interface EmployeeFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  employee?: Employee | null
  session: SessionPayload
}

interface FormData {
  fullName: string
  username: string
  phone: string
  password: string
  role: string
  assignedServiceId: string
}

interface FormErrors {
  fullName?: string
  username?: string
  password?: string
  role?: string
  assignedServiceId?: string
}

export default function EmployeeFormModal({
  isOpen,
  onClose,
  onSuccess,
  employee,
  session,
}: EmployeeFormModalProps) {
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const tv = useTranslations('validation')
  const locale = useLocale()

  const [form, setForm] = useState<FormData>({
    fullName: '',
    username: '',
    phone: '',
    password: '',
    role: '',
    assignedServiceId: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [services, setServices] = useState<MainService[]>([])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      if (data.success) {
        setServices(data.services)
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchServices()
    }
  }, [isOpen, fetchServices])

  useEffect(() => {
    if (employee) {
      setForm({
        fullName: employee.full_name,
        username: employee.username,
        phone: employee.phone_number || '',
        password: '',
        role: employee.role,
        assignedServiceId: employee.assigned_service_id || '',
      })
    } else {
      const defaultRole =
        session.role === 'service_supervisor' ? 'service_employee' : ''
      const defaultServiceId =
        session.role === 'service_supervisor' && session.assignedServiceId
          ? session.assignedServiceId
          : ''

      setForm({
        fullName: '',
        username: '',
        phone: '',
        password: '',
        role: defaultRole,
        assignedServiceId: defaultServiceId,
      })
    }
    setErrors({})
  }, [employee, isOpen, session])

  const needsService = form.role === 'service_supervisor' || form.role === 'service_employee'

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.fullName.trim()) {
      newErrors.fullName = tv('required')
    }
    if (!form.username.trim()) {
      newErrors.username = tv('required')
    }
    if (!employee && !form.password) {
      newErrors.password = tv('required')
    }
    if (form.password && form.password.length < 8) {
      newErrors.password = tv('passwordMin')
    }
    if (!form.role) {
      newErrors.role = tv('required')
    }
    if (needsService && !form.assignedServiceId) {
      newErrors.assignedServiceId = tv('required')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        full_name: form.fullName.trim(),
        username: form.username.trim(),
        phone_number: form.phone.trim() || null,
        role: form.role,
        assigned_service_id: needsService ? form.assignedServiceId : null,
      }

      if (form.password) {
        payload.password = form.password
      }

      const url = employee
        ? `/api/employees/${employee.employee_id}`
        : '/api/employees'
      const method = employee ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        toast.success(tc('success'))
        onSuccess()
        onClose()
      } else if (data.message === 'usernameTaken') {
        setErrors({ username: tv('usernameTaken') })
      } else if (data.message === 'missingFields') {
        toast.error(tc('error'))
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }

  const getRoleOptions = () => {
    if (session.role === 'hotel_supervisor') {
      return [
        { value: 'hotel_supervisor', label: t('hotelSupervisor') },
        { value: 'service_supervisor', label: t('serviceSupervisor') },
        { value: 'service_employee', label: t('serviceEmployee') },
      ]
    }
    if (session.role === 'service_supervisor') {
      const opts = [{ value: 'service_employee', label: t('serviceEmployee') }]
      if (employee?.role === 'service_supervisor') {
        opts.push({ value: 'service_supervisor', label: t('serviceSupervisor') })
      }
      return opts
    }
    return []
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {employee ? t('editEmployee') : t('addEmployee')}
          </h2>
          <button onClick={onClose} type="button" className="btn-ghost p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
          {/* Full Name */}
          <div>
            <label className="label">{t('fullName')}</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={cn('input', errors.fullName && 'input-error')}
              maxLength={100}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="label">{t('username')}</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={cn('input', errors.username && 'input-error')}
              maxLength={50}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-500">{errors.username}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="label">
              {t('phone')}{' '}
              <span className="text-gray-400">({tc('optional')})</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              maxLength={15}
            />
          </div>

          {/* Password */}
          <div>
            <label className="label">
              {t('password')}{' '}
              {employee && (
                <span className="text-gray-400">({tc('optional')})</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={cn('input pe-10', errors.password && 'input-error')}
                placeholder={employee ? tc('leaveEmptyToKeep') : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="label">{t('role')}</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                  assignedServiceId:
                    e.target.value === 'hotel_supervisor'
                      ? ''
                      : session.role === 'service_supervisor' &&
                        session.assignedServiceId
                        ? session.assignedServiceId
                        : form.assignedServiceId,
                })
              }
              className={cn('input', errors.role && 'input-error')}
              disabled={session.role === 'service_supervisor'}
            >
              <option value="">--</option>
              {getRoleOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Assigned Service */}
          {needsService && (
            <div>
              <label className="label">{t('assignedService')}</label>
              <select
                value={form.assignedServiceId}
                onChange={(e) =>
                  setForm({ ...form, assignedServiceId: e.target.value })
                }
                className={cn(
                  'input',
                  errors.assignedServiceId && 'input-error'
                )}
                disabled={
                  session.role === 'service_supervisor' &&
                  !!session.assignedServiceId
                }
              >
                <option value="">--</option>
                {services.map((svc) => (
                  <option key={svc.service_id} value={svc.service_id}>
                    {locale === 'ar'
                      ? svc.service_name.ar
                      : svc.service_name.en}
                  </option>
                ))}
              </select>
              {errors.assignedServiceId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.assignedServiceId}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
