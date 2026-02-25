import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'tokenAndPasswordRequired' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[@#$%^&*!]/.test(password)
    ) {
      return NextResponse.json(
        { success: false, message: 'passwordRequirements' },
        { status: 400 }
      )
    }

    // Find employee by reset token
    const { data: employee, error } = await supabaseAdmin
      .from('employees')
      .select('employee_id, password_reset_expires')
      .eq('password_reset_token', token)
      .is('deleted_at', null)
      .single()

    if (error || !employee) {
      return NextResponse.json(
        { success: false, message: 'invalidOrExpiredToken' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (
      employee.password_reset_expires &&
      new Date(employee.password_reset_expires) < new Date()
    ) {
      return NextResponse.json(
        { success: false, message: 'invalidOrExpiredToken' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and clear reset token
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq('employee_id', employee.employee_id)

    if (updateError) {
      console.error('Password reset update failed:', updateError)
      return NextResponse.json(
        { success: false, message: 'resetFailed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'passwordReset' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
