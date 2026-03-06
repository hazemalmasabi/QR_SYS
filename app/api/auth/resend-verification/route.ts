import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail, getVerificationEmailHtml, getVerificationEmailSubject } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, lang } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'emailRequired' },
        { status: 400 }
      )
    }

    // Find employee by email
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('employee_id, full_name, email_verified, hotel_id')
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ success: true, message: 'verificationSent' })
    }

    // Already verified
    if (employee.email_verified) {
      return NextResponse.json(
        { success: false, message: 'alreadyVerified' },
        { status: 400 }
      )
    }

    // Generate new token
    const emailVerificationToken = crypto.randomUUID()
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update token in database
    await supabaseAdmin
      .from('employees')
      .update({
        email_verification_token: emailVerificationToken,
        email_verification_expires: emailVerificationExpires,
      })
      .eq('employee_id', employee.employee_id)

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${emailVerificationToken}`

    // Send verification email
    const emailHtml = getVerificationEmailHtml(employee.full_name, verifyUrl, lang || 'ar')
    const emailSent = await sendEmail({
      to: email,
      subject: getVerificationEmailSubject(lang || 'ar'),
      html: emailHtml,
    })

    // Log to email_logs table
    await supabaseAdmin.from('email_logs').insert({
      hotel_id: employee.hotel_id,
      employee_id: employee.employee_id,
      email_to: email,
      email_type: 'verification',
      status: emailSent ? 'sent' : 'failed',
    })

    return NextResponse.json({ success: true, message: 'verificationSent' })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
