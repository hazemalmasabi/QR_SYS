import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/verify-email/confirm?status=invalid', request.url)
      )
    }

    // Find employee by verification token
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('employee_id, email_verification_expires')
      .eq('email_verification_token', token)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      return NextResponse.redirect(
        new URL('/verify-email/confirm?status=invalid', request.url)
      )
    }

    // Check if token has expired
    if (
      employee.email_verification_expires &&
      new Date(employee.email_verification_expires) < new Date()
    ) {
      return NextResponse.redirect(
        new URL('/verify-email/confirm?status=expired', request.url)
      )
    }

    // Mark email as verified and clear token
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      })
      .eq('employee_id', employee.employee_id)

    if (updateError) {
      console.error('Email verification update failed:', updateError)
      return NextResponse.redirect(
        new URL('/verify-email/confirm?status=error', request.url)
      )
    }

    return NextResponse.redirect(
      new URL('/verify-email/confirm?status=success', request.url)
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(
      new URL('/verify-email/confirm?status=error', request.url)
    )
  }
}
