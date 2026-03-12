import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { employeeId } = await params

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*, main_services(service_name)')
      .eq('employee_id', employeeId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Service supervisors can only view employees of their service
    if (
      session.role === 'service_supervisor' &&
      session.assignedServiceId &&
      employee.assigned_service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }
    const sanitized = { ...(employee as any) }
    delete sanitized.password_hash

    return NextResponse.json({ success: true, employee: sanitized })
  } catch (error) {
    console.error('Employee GET error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { employeeId } = await params
    const body = await request.json()
    const { full_name, username, phone_number, password, role, assigned_service_id, status } = body

    // Fetch existing employee
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Service supervisors can only update service_employees of their service or themselves
    if (session.role === 'service_supervisor') {
      if (employeeId !== session.employeeId) { // Not self
        if (existing.role === 'hotel_supervisor' || existing.role === 'service_supervisor') {
          return NextResponse.json(
            { success: false, message: 'forbidden' },
            { status: 403 }
          )
        }
        if (session.assignedServiceId && existing.assigned_service_id !== session.assignedServiceId) {
          return NextResponse.json(
            { success: false, message: 'forbidden' },
            { status: 403 }
          )
        }
      }
    }

    // Hotel supervisors cannot update the primary supervisor or other hotel supervisors (except themselves)
    if (session.role === 'hotel_supervisor') {
      if (existing.is_primary_supervisor) {
        return NextResponse.json(
          { success: false, message: 'forbidden' },
          { status: 403 }
        )
      }
      if (existing.role === 'hotel_supervisor' && employeeId !== session.employeeId) {
        return NextResponse.json(
          { success: false, message: 'forbidden' },
          { status: 403 }
        )
      }
    }

    // Prevent changing primary supervisor's email
    if (existing.is_primary_supervisor && body.email && body.email !== existing.email) {
      return NextResponse.json(
        { success: false, message: 'cannotChangePrimaryEmail' },
        { status: 403 }
      )
    }

    // Prevent disabling/deleting primary supervisor
    if (existing.is_primary_supervisor && status === 'disabled') {
      return NextResponse.json(
        { success: false, message: 'cannotDisablePrimary' },
        { status: 403 }
      )
    }

    // Prevent disabling self
    if (employeeId === session.employeeId && status === 'disabled') {
      return NextResponse.json(
        { success: false, message: 'cannotDisableSelf' },
        { status: 403 }
      )
    }

    // Service supervisor can only set role to service_employee
    if (session.role === 'service_supervisor' && role && role !== 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Check global username uniqueness if changed
    if (username && username !== existing.username) {
      const { data: duplicate } = await supabaseAdmin
        .from('employees')
        .select('employee_id')
        .eq('username', username)
        .is('deleted_at', null)
        .neq('employee_id', employeeId)
        .maybeSingle()

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: 'usernameTaken' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (username !== undefined) updateData.username = username
    if (phone_number !== undefined) updateData.phone_number = phone_number || null
    if (role !== undefined) updateData.role = role
    if (assigned_service_id !== undefined) {
      updateData.assigned_service_id = role === 'hotel_supervisor' ? null : assigned_service_id
    }
    if (status !== undefined) updateData.status = status

    // Hash password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12)
    }

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('employee_id', employeeId)
      .select('*, main_services(service_name)')
      .single()

    if (error) {
      console.error('Employee update error:', error)
      return NextResponse.json(
        { success: false, message: 'updateError' },
        { status: 500 }
      )
    }
    const sanitized = { ...(employee as any) }
    delete sanitized.password_hash

    return NextResponse.json({ success: true, employee: sanitized })
  } catch (error) {
    console.error('Employee PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { employeeId } = await params

    // Fetch existing employee
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .single()

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'notFound' },
        { status: 404 }
      )
    }

    // Prevent deleting primary supervisor
    if (existing.is_primary_supervisor) {
      return NextResponse.json(
        { success: false, message: 'cannotDeletePrimary' },
        { status: 403 }
      )
    }

    // Prevent deleting self
    if (employeeId === session.employeeId) {
      return NextResponse.json(
        { success: false, message: 'cannotDeleteSelf' },
        { status: 403 }
      )
    }

    // Service supervisors can only delete service_employees of their service
    if (session.role === 'service_supervisor') {
      if (existing.role === 'hotel_supervisor' || existing.role === 'service_supervisor') {
        return NextResponse.json(
          { success: false, message: 'forbidden' },
          { status: 403 }
        )
      }
      if (session.assignedServiceId && existing.assigned_service_id !== session.assignedServiceId) {
        return NextResponse.json(
          { success: false, message: 'forbidden' },
          { status: 403 }
        )
      }
    }

    // Hotel supervisors cannot delete other hotel supervisors
    if (session.role === 'hotel_supervisor' && existing.role === 'hotel_supervisor') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('employees')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.employeeId,
        status: 'disabled',
        updated_at: new Date().toISOString(),
      })
      .eq('employee_id', employeeId)
      .eq('hotel_id', session.hotelId)

    if (error) {
      console.error('Employee delete error:', error)
      return NextResponse.json(
        { success: false, message: 'deleteError' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Employee DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
