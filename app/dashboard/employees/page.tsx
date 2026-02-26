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
  Users,
  Filter,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Employee, MainService, SessionPayload } from '@/types'
import EmployeeFormModal from './EmployeeFormModal'

export default function EmployeesPage() {
  const t = useTranslations('employees')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [employees, setEmployees] = useState<(Employee & { main_services?: { service_name: { ar: string; en: string } } | null })[]>([])
  const [services, setServices] = useState<MainService[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 25
  const totalPages = Math.ceil(total / limit)
  const [roleFilter, setRoleFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [session, setSession] = useState<SessionPayload | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (serviceFilter) params.set('service_id', serviceFilter)
      params.set('page', page.toString())
      params.set('limit', limit.toString())

      const res = await fetch(`/api/employees?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setEmployees(data.employees)
        setTotal(data.total || 0)
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setLoading(false)
    }
  }, [roleFilter, serviceFilter, tc, page])

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
    fetchSession()
    fetchServices()
  }, [fetchSession, fetchServices])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees, page])

  const requestDelete = (employee: Employee) => {
    if (employee.is_primary_supervisor) return
    setEmployeeToDelete(employee)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!employeeToDelete) return

    try {
      const res = await fetch(`/api/employees/${employeeToDelete.employee_id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchEmployees()
      } else {
        toast.error(data.message === 'cannotDeletePrimary' ? t('cannotDeletePrimary') : tc('error'))
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setDeleteModalOpen(false)
      setEmployeeToDelete(null)
    }
  }

  const handleToggleStatus = async (employee: Employee) => {
    if (employee.is_primary_supervisor) return
    setTogglingId(employee.employee_id)
    const newStatus = employee.status === 'active' ? 'disabled' : 'active'

    try {
      const res = await fetch(`/api/employees/${employee.employee_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(tc('success'))
        fetchEmployees()
      } else {
        toast.error(
          data.message === 'cannotDisablePrimary'
            ? t('cannotDisablePrimary')
            : tc('error')
        )
      }
    } catch {
      toast.error(tc('error'))
    } finally {
      setTogglingId(null)
    }
  }

  const openAdd = () => {
    setEditingEmployee(null)
    setModalOpen(true)
  }

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setModalOpen(true)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'hotel_supervisor':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            {t('hotelSupervisor')}
          </span>
        )
      case 'service_supervisor':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {t('serviceSupervisor')}
          </span>
        )
      case 'service_employee':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {t('serviceEmployee')}
          </span>
        )
      default:
        return null
    }
  }

  const getServiceName = (emp: (typeof employees)[0]) => {
    if (!emp.main_services) return '\u2014'
    const name = emp.main_services.service_name
    return locale === 'ar' ? name.ar : name.en
  }

  const formatLastLogin = (date: string | null) => {
    if (!date) return '\u2014'
    return new Date(date).toLocaleDateString(
      locale === 'ar' ? 'ar-SA' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  }

  const canManageEmployees =
    session?.role === 'hotel_supervisor' || session?.role === 'service_supervisor'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {canManageEmployees && (
          <button onClick={openAdd} className="btn-primary">
            <Plus className="h-4 w-4" />
            {t('addEmployee')}
          </button>
        )}
      </div>

      {/* Compact Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="input max-w-[200px] py-1.5 text-sm"
          >
            <option value="">{t('role')} ({tc('all')})</option>
            <option value="hotel_supervisor">{t('hotelSupervisor')}</option>
            <option value="service_supervisor">{t('serviceSupervisor')}</option>
            <option value="service_employee">{t('serviceEmployee')}</option>
          </select>
        </div>

        {/* Service Filter (only for hotel supervisors) */}
        {session?.role === 'hotel_supervisor' && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value)
                setPage(1)
              }}
              className="input max-w-[200px] py-1.5 text-sm"
            >
              <option value="">{t('assignedService')} ({tc('all')})</option>
              {services.map((svc) => (
                <option key={svc.service_id} value={svc.service_id}>
                  {locale === 'ar'
                    ? svc.service_name.ar
                    : svc.service_name.en}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-lg font-medium">{t('noEmployees')}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('fullName')}</th>
                <th>{t('username')}</th>
                <th>{t('role')}</th>
                <th>{t('assignedService')}</th>
                <th>{t('phone')}</th>
                <th>{tc('status')}</th>
                <th>{t('lastLogin')}</th>
                <th className="text-end">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.employee_id}>
                  <td className="font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {emp.full_name}
                      {emp.is_primary_supervisor && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Shield className="h-3 w-3" />
                          {t('primarySupervisor')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-gray-600">{emp.username}</td>
                  <td>{getRoleBadge(emp.role)}</td>
                  <td className="text-gray-600">{getServiceName(emp)}</td>
                  <td className="text-gray-600">
                    {emp.phone_number || '\u2014'}
                  </td>
                  <td>
                    <span
                      className={cn(
                        emp.status === 'active'
                          ? 'badge-active'
                          : 'badge-disabled'
                      )}
                    >
                      {emp.status === 'active'
                        ? tc('active')
                        : tc('disabled')}
                    </span>
                  </td>
                  <td className="text-sm text-gray-500">
                    {formatLastLogin(emp.last_login)}
                  </td>
                  <td>
                    {canManageEmployees && !emp.is_primary_supervisor ? (
                      (() => {
                        const isSelf = session?.employeeId === emp.employee_id
                        const isHigherOrEqualRole =
                          session?.role === 'service_supervisor' &&
                          (emp.role === 'hotel_supervisor' || (emp.role === 'service_supervisor' && !isSelf))
                        const isHotelSupervisorRestricted =
                          session?.role === 'hotel_supervisor' &&
                          (emp.is_primary_supervisor || (emp.role === 'hotel_supervisor' && !isSelf))

                        if ((isHigherOrEqualRole || isHotelSupervisorRestricted) && !isSelf) {
                          return null
                        }

                        return (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(emp)}
                              className="btn-ghost p-2"
                              title={tc('edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {!isSelf && (
                              <>
                                <button
                                  onClick={() => handleToggleStatus(emp)}
                                  className="btn-ghost p-2"
                                  disabled={togglingId === emp.employee_id}
                                  title={
                                    emp.status === 'active'
                                      ? t('disable')
                                      : t('enable')
                                  }
                                >
                                  {togglingId === emp.employee_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : emp.status === 'active' ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => requestDelete(emp)}
                                  className="btn-ghost p-2 text-red-600 hover:text-red-700"
                                  title={tc('delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })()
                    ) : null}
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
      {session && (
        <EmployeeFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchEmployees}
          employee={editingEmployee}
          session={session}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && employeeToDelete && (
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
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setEmployeeToDelete(null)
                  }}
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
