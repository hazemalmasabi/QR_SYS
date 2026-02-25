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
  Package,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Item, MainService, SubService, SessionPayload } from '@/types'
import ItemFormModal from './ItemFormModal'

interface ItemWithRelations extends Item {
  sub_services?: {
    sub_service_id: string
    sub_service_name: { ar: string; en: string }
    parent_service_id: string
    display_order?: number
    main_services?: {
      service_id: string
      service_name: { ar: string; en: string }
      hotel_id: string
      display_order?: number
    }
  }
}

export default function ItemsPage() {
  const t = useTranslations('items')
  const ts = useTranslations('services')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [items, setItems] = useState<ItemWithRelations[]>([])
  const [services, setServices] = useState<MainService[]>([])
  const [subServices, setSubServices] = useState<SubService[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 25
  const totalPages = Math.ceil(total / limit)
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [serviceFilter, setServiceFilter] = useState('')
  const [subServiceFilter, setSubServiceFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const getName = useCallback(
    (name: { ar: string; en: string }) => (locale === 'ar' ? name.ar : name.en),
    [locale]
  )

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

  const fetchSubServicesForFilter = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (serviceFilter) params.set('parent_service_id', serviceFilter)
      const res = await fetch(`/api/sub-services?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSubServices(data.subServices)
      }
    } catch {
      // silently fail
    }
  }, [serviceFilter])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (subServiceFilter) params.set('sub_service_id', subServiceFilter)
      else if (serviceFilter) params.set('service_id', serviceFilter)

      params.set('page', page.toString())
      params.set('limit', limit.toString())

      const res = await fetch(`/api/items?${params.toString()}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        const sorted = data.items.sort((a: ItemWithRelations, b: ItemWithRelations) => {
          const mainOrderA = a.sub_services?.main_services?.display_order ?? Number.MAX_SAFE_INTEGER
          const mainOrderB = b.sub_services?.main_services?.display_order ?? Number.MAX_SAFE_INTEGER
          if (mainOrderA !== mainOrderB) {
            return mainOrderA - mainOrderB
          }

          const subOrderA = a.sub_services?.display_order ?? Number.MAX_SAFE_INTEGER
          const subOrderB = b.sub_services?.display_order ?? Number.MAX_SAFE_INTEGER
          if (subOrderA !== subOrderB) {
            return subOrderA - subOrderB
          }

          return (a.display_order ?? 0) - (b.display_order ?? 0)
        })
        setItems(sorted)
        setTotal(data.total || 0)
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [serviceFilter, subServiceFilter, tc])

  useEffect(() => {
    fetchSession()
    fetchServices()
  }, [fetchSession, fetchServices])

  useEffect(() => {
    fetchSubServicesForFilter()
    setSubServiceFilter('')
  }, [fetchSubServicesForFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems, page])

  const canManage =
    session?.role === 'hotel_supervisor' || session?.role === 'service_supervisor'

  const requestDelete = (itemId: string) => {
    setDeletingId(itemId)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/items/${deletingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchItems()
      } else {
        toast.error(tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (item: ItemWithRelations) => {
    setTogglingId(item.item_id)
    try {
      const res = await fetch(`/api/items/${item.item_id}`, {
        method: 'PATCH',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchItems()
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
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item: ItemWithRelations) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const getSubServiceName = (item: ItemWithRelations) => {
    if (item.sub_services) {
      return getName(item.sub_services.sub_service_name)
    }
    return '—'
  }

  const getServiceName = (item: ItemWithRelations) => {
    if (item.sub_services?.main_services) {
      return getName(item.sub_services.main_services.service_name)
    }
    return '—'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {canManage && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t('addItem')}
          </button>
        )}
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Service Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value)
              setSubServiceFilter('')
              setPage(1)
            }}
            className="input max-w-[200px] py-1.5 text-sm"
          >
            <option value="">{t('service')} ({tc('all')})</option>
            {services.map((s) => (
              <option key={s.service_id} value={s.service_id}>
                {getName(s.service_name)}
              </option>
            ))}
          </select>
        </div>

        {/* Sub-service Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={subServiceFilter}
            onChange={(e) => {
              setSubServiceFilter(e.target.value)
              setPage(1)
            }}
            className="input max-w-[200px] py-1.5 text-sm"
            disabled={!serviceFilter}
          >
            <option value="">{t('subService')} ({tc('all')})</option>
            {subServices.map((sub) => (
              <option key={sub.sub_service_id} value={sub.sub_service_id}>
                {getName(sub.sub_service_name)}
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Package className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">{t('noItems')}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{ts('image')}</th>
                <th>{t('itemNameAr')}</th>
                <th>{t('itemNameEn')}</th>
                <th>{t('subService')}</th>
                <th>{t('price')}</th>
                <th>#</th>
                <th>{tc('status')}</th>
                {canManage && <th>{tc('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.item_id}>
                  <td>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={getName(item.item_name)}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="font-medium text-gray-900" dir="rtl">
                    {item.item_name.ar}
                  </td>
                  <td className="font-medium text-gray-900" dir="ltr">
                    {item.item_name.en}
                  </td>
                  <td>
                    <div className="text-sm">
                      <div>{getSubServiceName(item)}</div>
                      <div className="text-xs text-gray-400">
                        {getServiceName(item)}
                      </div>
                    </div>
                  </td>
                  <td className="font-medium">
                    {item.is_free ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-600">
                        {t('free')}
                      </span>
                    ) : (
                      item.price.toFixed(2)
                    )}
                  </td>
                  <td>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {item.display_order}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        item.availability_status === 'available'
                          ? 'badge-active'
                          : 'badge-inactive'
                      }
                    >
                      {item.availability_status === 'available'
                        ? t('available')
                        : t('unavailable')}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="btn-ghost p-2"
                          title={tc('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="btn-ghost p-2"
                          disabled={togglingId === item.item_id}
                          title={
                            item.availability_status === 'available'
                              ? t('unavailable')
                              : t('available')
                          }
                        >
                          {togglingId === item.item_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : item.availability_status === 'available' ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => requestDelete(item.item_id)}
                          className="btn-ghost p-2 text-red-600 hover:text-red-700"
                          title={tc('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
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
      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchItems}
        item={editingItem}
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
