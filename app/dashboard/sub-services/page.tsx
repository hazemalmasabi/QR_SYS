'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Filter,
  Layers,
  Clock,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SubService, MainService, SessionPayload } from '@/types'
import SubServiceFormModal from './SubServiceFormModal'

interface SubServiceWithParent extends SubService {
  main_services?: {
    service_id: string
    service_name: { ar: string; en: string }
    hotel_id: string
    display_order?: number
  }
}

export default function SubServicesPage() {
  const t = useTranslations('subServices')
  const ts = useTranslations('services')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [subServices, setSubServices] = useState<SubServiceWithParent[]>([])
  const [services, setServices] = useState<MainService[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 25
  const totalPages = Math.ceil(total / limit)
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [parentFilter, setParentFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSubService, setEditingSubService] = useState<SubService | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data.success) {
        setSession(data.session)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/services', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setServices(data.services)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchSubServices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (parentFilter) params.set('parent_service_id', parentFilter)
      params.set('page', page.toString())
      params.set('limit', limit.toString())

      const res = await fetch(`/api/sub-services?${params.toString()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        const sorted = data.subServices.sort((a: SubServiceWithParent, b: SubServiceWithParent) => {
          const parentOrderA = a.main_services?.display_order ?? Number.MAX_SAFE_INTEGER
          const parentOrderB = b.main_services?.display_order ?? Number.MAX_SAFE_INTEGER
          if (parentOrderA !== parentOrderB) {
            return parentOrderA - parentOrderB
          }
          return (a.display_order ?? 0) - (b.display_order ?? 0)
        })
        setSubServices(sorted)
        setTotal(data.total || 0)
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [parentFilter, tc])

  useEffect(() => {
    fetchSession()
    fetchServices()
  }, [fetchSession, fetchServices])

  useEffect(() => {
    fetchSubServices()
  }, [fetchSubServices])

  const canManage =
    session?.role === 'hotel_supervisor' || session?.role === 'service_supervisor'

  const requestDelete = (subServiceId: string) => {
    setDeletingId(subServiceId)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/sub-services/${deletingId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchSubServices()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (subService: SubServiceWithParent) => {
    setTogglingId(subService.sub_service_id)
    try {
      const res = await fetch(
        `/api/sub-services/${subService.sub_service_id}`,
        { method: 'PATCH' }
      )
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchSubServices()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setTogglingId(null)
    }
  }

  const openAdd = () => {
    setEditingSubService(null)
    setModalOpen(true)
  }

  const openEdit = (subService: SubServiceWithParent) => {
    setEditingSubService(subService)
    setModalOpen(true)
  }

  const getName = (name: { ar: string; en: string }) =>
    locale === 'ar' ? name.ar : name.en

  const getParentName = (sub: SubServiceWithParent) => {
    if (sub.main_services) {
      return getName(sub.main_services.service_name)
    }
    const parent = services.find((s) => s.service_id === sub.parent_service_id)
    return parent ? getName(parent.service_name) : '—'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {canManage && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t('addSubService')}
          </button>
        )}
      </div>

      {/* Compact Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={parentFilter}
          onChange={(e) => {
            setParentFilter(e.target.value)
            setPage(1)
          }}
          className="input max-w-[220px] py-1.5 text-sm"
        >
          <option value="">{tc('all')}</option>
          {services.map((s) => (
            <option key={s.service_id} value={s.service_id}>
              {getName(s.service_name)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : subServices.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-gray-500">
          <Layers className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-lg font-medium">{t('noSubServices')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subServices.map((sub) => (
            <div
              key={sub.sub_service_id}
              className="card group relative overflow-hidden p-0 transition-shadow hover:shadow-lg"
            >
              {/* Image - compact */}
              <div className="relative h-28 overflow-hidden bg-gray-100">
                {sub.image_url ? (
                  <img
                    src={sub.image_url}
                    alt={getName(sub.sub_service_name)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-50">
                    <ImageIcon className="h-8 w-8 text-gray-300" />
                  </div>
                )}
                {/* Order badge */}
                <span className="absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow">
                  {sub.display_order}
                </span>
                {/* Status badge */}
                <span
                  className={cn(
                    'absolute end-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow',
                    sub.status === 'active'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-400 text-white'
                  )}
                >
                  {sub.status === 'active' ? tc('active') : tc('inactive')}
                </span>
              </div>

              {/* Content - compact */}
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
                  {getName(sub.sub_service_name)}
                </h3>
                <p className="text-xs text-gray-400 line-clamp-1">
                  {locale === 'ar' ? sub.sub_service_name.en : sub.sub_service_name.ar}
                </p>
                {/* Parent service */}
                <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">
                  {getParentName(sub)}
                </p>
                {/* Availability time */}
                <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock className="h-3 w-3 shrink-0" />
                  {sub.availability_type === 'scheduled' && sub.start_time && sub.end_time
                    ? `${sub.start_time} - ${sub.end_time}`
                    : '24/7'}
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="mt-2 flex items-center gap-0.5 border-t border-gray-100 pt-2">
                    <button
                      onClick={() => openEdit(sub)}
                      className="btn-ghost p-1.5"
                      title={tc('edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(sub)}
                      className="btn-ghost p-1.5"
                      disabled={togglingId === sub.sub_service_id}
                      title={
                        sub.status === 'active' ? tc('inactive') : tc('active')
                      }
                    >
                      {togglingId === sub.sub_service_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : sub.status === 'active' ? (
                        <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => requestDelete(sub.sub_service_id)}
                      className="btn-ghost p-1.5 text-red-600 hover:text-red-700"
                      title={tc('delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
      <SubServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchSubServices}
        subService={editingSubService}
        services={services}
      />

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
