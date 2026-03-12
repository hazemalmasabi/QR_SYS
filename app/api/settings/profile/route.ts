import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSession, destroySession } from '@/lib/auth'
import { sendEmail, getVerificationEmailHtml, getVerificationEmailSubject } from '@/lib/email'

export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json(
                { success: false, message: 'unauthorized' },
                { status: 401 }
            )
        }

        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('full_name, email')
            .eq('employee_id', session.employeeId)
            .is('deleted_at', null)
            .single()

        if (!employee) {
            return NextResponse.json(
                { success: false, message: 'notFound' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, profile: employee })
    } catch (error) {
        console.error('Profile GET error:', error)
        return NextResponse.json(
            { success: false, message: 'internalError' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json(
                { success: false, message: 'unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { full_name, email, password, lang = 'ar' } = body

        // Fetch existing employee
        const { data: existing } = await supabaseAdmin
            .from('employees')
            .select('*')
            .eq('employee_id', session.employeeId)
            .is('deleted_at', null)
            .single()

        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'notFound' },
                { status: 404 }
            )
        }

        const updates: any = {
            updated_at: new Date().toISOString(),
        }

        let emailChanged = false

        if (full_name && full_name !== existing.full_name) {
            updates.full_name = full_name
        }

        if (password) {
            updates.password_hash = await bcrypt.hash(password, 12)
        }

        if (email && email !== existing.email) {
            // Check if new email is already taken
            const { data: duplicate } = await supabaseAdmin
                .from('employees')
                .select('employee_id')
                .eq('email', email)
                .neq('employee_id', session.employeeId)
                .is('deleted_at', null)
                .single()

            if (duplicate) {
                return NextResponse.json(
                    { success: false, message: 'emailTaken' },
                    { status: 409 }
                )
            }

            const emailVerificationToken = crypto.randomUUID()
            const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

            updates.email = email
            updates.email_verified = false
            updates.email_verification_token = emailVerificationToken
            updates.email_verification_expires = emailVerificationExpires

            emailChanged = true
        }

        const { error: updateError } = await supabaseAdmin
            .from('employees')
            .update(updates)
            .eq('employee_id', session.employeeId)

        if (updateError) {
            console.error('Profile update failed:', updateError)
            return NextResponse.json(
                { success: false, message: 'updateError' },
                { status: 500 }
            )
        }

        // Send verification email if it changed
        if (emailChanged) {
            const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${updates.email_verification_token}`
            const html = await getVerificationEmailHtml(full_name || existing.full_name, verifyUrl, lang)

            const emailSent = await sendEmail({
                to: email,
                subject: await getVerificationEmailSubject(lang),
                html,
            })

            if (!emailSent) {
                console.error('Verification email failed to send to:', email)
            }

            // Destroy session because primary supervisors cannot login without verified email
            if (existing.is_primary_supervisor) {
                await destroySession()
            }
        }

        return NextResponse.json({
            success: true,
            emailChanged
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json(
            { success: false, message: 'internalError' },
            { status: 500 }
        )
    }
}
