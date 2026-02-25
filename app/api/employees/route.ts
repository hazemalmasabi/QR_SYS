import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    // Only supervisors can list employees
    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const serviceId = searchParams.get('service_id')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '25', 10)
    const offset = (page - 1) * limit

    let countQuery = supabaseAdmin
      .from('employees')
      .select('employee_id', { count: 'exact', head: true })
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)

    if (session.role === 'service_supervisor' && session.assignedServiceId) countQuery = countQuery.eq('assigned_service_id', session.assignedServiceId)
    if (role) countQuery = countQuery.eq('role', role)
    if (serviceId) countQuery = countQuery.eq('assigned_service_id', serviceId)
    if (search) countQuery = countQuery.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)

    const { count } = await countQuery

    let dataQuery = supabaseAdmin
      .from('employees')
      .select('*, main_services(service_name)')
      .eq('hotel_id', session.hotelId)
      .is('deleted_at', null)
      .order('is_primary_supervisor', { ascending: false })
      .order('created_at', { ascending: true })

    if (session.role === 'service_supervisor' && session.assignedServiceId) dataQuery = dataQuery.eq('assigned_service_id', session.assignedServiceId)
    if (role) dataQuery = dataQuery.eq('role', role)
    if (serviceId) dataQuery = dataQuery.eq('assigned_service_id', serviceId)
    if (search) dataQuery = dataQuery.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)

    const { data: allEmployees, error } = await dataQuery

    if (error) {
      console.error('Employees fetch error:', error)
      return NextResponse.json(
        { success: false, message: 'fetchError' },
        { status: 500 }
      )
    }

    const roleWeight = {
      hotel_supervisor: 1,
      service_supervisor: 2,
      service_employee: 3
    }

    const sortedData = (allEmployees || []).sort((a, b) => {
      if (a.is_primary_supervisor && !b.is_primary_supervisor) return -1;
      if (!a.is_primary_supervisor && b.is_primary_supervisor) return 1;

      const weightA = roleWeight[a.role as keyof typeof roleWeight] || 99;
      const weightB = roleWeight[b.role as keyof typeof roleWeight] || 99;
      if (weightA !== weightB) return weightA - weightB;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    const paginatedData = limit > 0 ? sortedData.slice(offset, offset + limit) : sortedData;

    const sanitized = paginatedData.map(
      ({ password_hash, ...rest }: Record<string, unknown>) => rest
    )

    return NextResponse.json({
      success: true,
      employees: sanitized,
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    console.error('Employees API error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      )
    }

    // Only supervisors can create employees
    if (session.role === 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { full_name, username, phone_number, password, role, assigned_service_id } = body

    if (!full_name || !username || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'missingFields' },
        { status: 400 }
      )
    }

    // Validate role permissions
    if (role === 'hotel_supervisor' && session.role !== 'hotel_supervisor') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Service supervisor can only create service_employee role
    if (session.role === 'service_supervisor' && role !== 'service_employee') {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // service_supervisor and service_employee require assigned_service_id
    if ((role === 'service_supervisor' || role === 'service_employee') && !assigned_service_id) {
      return NextResponse.json(
        { success: false, message: 'serviceRequired' },
        { status: 400 }
      )
    }

    // Service supervisor can only assign their own service
    if (
      session.role === 'service_supervisor' &&
      session.assignedServiceId &&
      assigned_service_id !== session.assignedServiceId
    ) {
      return NextResponse.json(
        { success: false, message: 'forbidden' },
        { status: 403 }
      )
    }

    // Check global username uniqueness
    const { data: existingUser } = await supabaseAdmin
      .from('employees')
      .select('employee_id')
      .eq('username', username)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'usernameTaken' },
        { status: 409 }
      )
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    const now = new Date().toISOString()

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .insert({
        hotel_id: session.hotelId,
        full_name,
        username,
        phone_number: phone_number || null,
        password_hash,
        role,
        assigned_service_id: role === 'hotel_supervisor' ? null : assigned_service_id,
        is_primary_supervisor: false,
        status: 'active',
        email_verified: false,
        created_at: now,
        updated_at: now,
      })
      .select('*, main_services(service_name)')
      .single()

    if (error) {
      console.error('Employee create error:', error)
      return NextResponse.json(
        { success: false, message: 'createError' },
        { status: 500 }
      )
    }

    // Remove password_hash from response
    const { password_hash: _, ...sanitized } = employee as Record<string, unknown>

    return NextResponse.json(
      { success: true, employee: sanitized },
      { status: 201 }
    )
  } catch (error) {
    console.error('Employees POST error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
