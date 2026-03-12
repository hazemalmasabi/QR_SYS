export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail, getPasswordResetEmailHtml, getPasswordResetEmailSubject } from '@/lib/email'

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
      .select('employee_id, full_name, hotel_id')
      .eq('email', email)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { success: false, message: 'emailNotFound' },
        { status: 404 }
      )
    }

    // Generate password reset token with 1 hour expiry
    const passwordResetToken = crypto.randomUUID()
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Update token in database
    await supabaseAdmin
      .from('employees')
      .update({
        password_reset_token: passwordResetToken,
        password_reset_expires: passwordResetExpires,
      })
      .eq('employee_id', employee.employee_id)

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${passwordResetToken}`

    // Send reset email
    const emailHtml = await getPasswordResetEmailHtml(employee.full_name, resetUrl, lang || 'ar')
    const emailSent = await sendEmail({
      to: email,
      subject: await getPasswordResetEmailSubject(lang || 'ar'),
      html: emailHtml,
    })

    // Log to email_logs table
    await supabaseAdmin.from('email_logs').insert({
      hotel_id: employee.hotel_id,
      employee_id: employee.employee_id,
      email_to: email,
      email_type: 'password_reset',
      status: emailSent ? 'sent' : 'failed',
    })

    return NextResponse.json({ success: true, message: 'resetEmailSent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
