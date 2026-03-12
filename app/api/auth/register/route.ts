import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { registerSchema } from '@/lib/validations'
import { sendEmail, getVerificationEmailHtml, getVerificationEmailSubject } from '@/lib/email'
import { CURRENCIES } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      hotelNameEn,
      hotelNameSecondary,
      languageSecondary,
      timezone,
      currencyCode,
      fullName,
      email,
      phone,
      password
    } = parsed.data

    // Check if email is already taken
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('employee_id')
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        { success: false, message: 'emailTaken' },
        { status: 409 }
      )
    }

    // Get currency symbol
    const currency = CURRENCIES.find((c) => c.code === currencyCode)
    const currencySymbol = currency?.symbol || currencyCode

    // Create hotel record
    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hotels')
      .insert({
        hotel_name: languageSecondary === 'ar' ? hotelNameSecondary : '', // Keep base hotel_name for core reference
        hotel_name_translations: languageSecondary === 'none' ? {
          en: hotelNameEn
        } : {
          en: hotelNameEn,
          [languageSecondary]: hotelNameSecondary
        },
        language_secondary: languageSecondary,
        timezone,
        currency_code: currencyCode,
        currency_symbol: currencySymbol,
        status: 'active',
      })
      .select('hotel_id')
      .single()

    if (hotelError || !hotel) {
      console.error('Hotel creation failed:', hotelError)
      return NextResponse.json(
        { success: false, message: 'registrationFailed' },
        { status: 500 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate email verification token
    const emailVerificationToken = crypto.randomUUID()
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Generate a username from the email (part before @)
    const username = email.split('@')[0]

    // Create primary supervisor employee
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert({
        hotel_id: hotel.hotel_id,
        full_name: fullName,
        username,
        email,
        phone_number: phone,
        password_hash: hashedPassword,
        role: 'hotel_supervisor',
        is_primary_supervisor: true,
        status: 'active',
        email_verified: false,
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires,
      })
      .select('employee_id')
      .single()

    if (employeeError || !employee) {
      console.error('Employee creation failed:', employeeError)
      // Rollback hotel creation
      await supabaseAdmin.from('hotels').delete().eq('hotel_id', hotel.hotel_id)
      return NextResponse.json(
        { success: false, message: 'registrationFailed' },
        { status: 500 }
      )
    }

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${emailVerificationToken}`

    // Send verification email
    const lang = (body as any).lang || 'ar'
    const emailHtml = await getVerificationEmailHtml(fullName, verifyUrl, lang)
    const emailSent = await sendEmail({
      to: email,
      subject: await getVerificationEmailSubject(lang),
      html: emailHtml,
    })

    // Log to email_logs table
    await supabaseAdmin.from('email_logs').insert({
      hotel_id: hotel.hotel_id,
      employee_id: employee.employee_id,
      email_to: email,
      email_type: 'verification',
      status: emailSent ? 'sent' : 'failed',
    })

    return NextResponse.json(
      { success: true, message: 'registered' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
