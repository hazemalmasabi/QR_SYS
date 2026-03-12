import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/server'
import { loginUnifiedSchema } from '@/lib/validations'
import { createSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const parsed = loginUnifiedSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { identifier, password, rememberMe } = parsed.data

    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { success: false, message: 'invalidCredentials' },
        { status: 401 }
      )
    }

    // Check email verified only if they logged in via email and it's a primary supervisor?
    // The previous implementation checked email_verified for `isEmailLogin` (primary supervisors).
    // Let's check it generally if they are the primary supervisor.
    if (employee.is_primary_supervisor && !employee.email_verified) {
      return NextResponse.json(
        { success: false, message: 'emailNotVerified' },
        { status: 403 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, employee.password_hash)
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, message: 'invalidCredentials' },
        { status: 401 }
      )
    }

    // Check employee is active
    if (employee.status !== 'active') {
      return NextResponse.json(
        { success: false, message: 'accountDisabled' },
        { status: 403 }
      )
    }

    // Create session
    await createSession({
      employeeId: employee.employee_id,
      hotelId: employee.hotel_id,
      role: employee.role,
      isPrimarySupervisor: employee.is_primary_supervisor,
      assignedServiceId: employee.assigned_service_id,
      fullName: employee.full_name,
    }, rememberMe)

    // Update last_login
    await supabaseAdmin
      .from('employees')
      .update({ last_login: new Date().toISOString() })
      .eq('employee_id', employee.employee_id)

    // Check system supported languages and enforce them
    const { data: hotel } = await supabaseAdmin
      .from('hotels')
      .select('language_secondary')
      .eq('hotel_id', employee.hotel_id)
      .single()

    let finalLocale = 'en'
    const cookieStore = await cookies()
    const currentLocale = cookieStore.get('locale')?.value || 'en'

    // We only allow 'en' (primary) or the hotel's secondary language.
    // If the user is currently in a language not supported by this hotel (e.g. 'ar' but hotel is 'en'/'fr'),
    // we force them to English.
    const allowedLocales = ['en']
    if (hotel?.language_secondary && hotel.language_secondary !== 'none') {
      allowedLocales.push(hotel.language_secondary)
    }

    if (allowedLocales.includes(currentLocale)) {
      finalLocale = currentLocale
    } else {
      finalLocale = 'en'
    }

    cookieStore.set('locale', finalLocale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

    return NextResponse.json({
      success: true,
      role: employee.role,
      redirectUrl: '/dashboard',
      locale: finalLocale
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
