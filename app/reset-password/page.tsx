'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { z } from 'zod'
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  LogIn,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'
import { cn, getPasswordStrength } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'passwordMin')
      .regex(/[A-Z]/, 'passwordRequirements')
      .regex(/[a-z]/, 'passwordRequirements')
      .regex(/[0-9]/, 'passwordRequirements')
      .regex(/[@#$%^&*!]/, 'passwordRequirements'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  })

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword')
  const tReg = useTranslations('auth.register')
  const tv = useTranslations('validation')
  const tLogin = useTranslations('auth.login')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const passwordValue = watch('password')
  const strength = getPasswordStrength(passwordValue || '')

  const resolveValidation = (key: string) => {
    const map: Record<string, string> = {
      required: tv('required'),
      passwordMin: tv('passwordMin'),
      passwordRequirements: tv('passwordRequirements'),
      passwordMismatch: tv('passwordMismatch'),
    }
    return map[key] || key
  }

  const strengthColor = () => {
    switch (strength.label) {
      case 'weak':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'strong':
        return 'bg-green-500'
      case 'veryStrong':
        return 'bg-emerald-500'
      default:
        return 'bg-gray-200'
    }
  }

  const strengthLabel = () => {
    if (!passwordValue) return ''
    switch (strength.label) {
      case 'weak':
        return tReg('weak')
      case 'medium':
        return tReg('medium')
      case 'strong':
        return tReg('strong')
      case 'veryStrong':
        return tReg('veryStrong')
      default:
        return ''
    }
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setFormError(null)

    if (!token) {
      const msg = tv('required')
      setFormError(msg)
      toast.error(msg)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })

      if (res.ok) {
        setSuccess(true)
        toast.success(t('success'))
      } else {
        const result = await res.json()
        const msg = result.message || tv('required')
        setFormError(msg)
        toast.error(msg)
      }
    } catch {
      const msg = tv('required')
      setFormError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher variant="dropdown" />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        {/* Card */}
        <div className="card">
          {success ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="mb-4 text-sm text-gray-600">{t('success')}</p>
              <Link href="/login" className="btn-primary inline-flex">
                <LogIn className="h-4 w-4" />
                {tLogin('loginBtn')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="label">
                  {t('newPassword')}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="new-password"
                    className={cn('input icon-input-both pe-10 ps-10', errors.password && 'input-error')}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.password.message || '')}
                  </p>
                )}

                {/* Password Requirements Checklist */}
                <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">{tv('pwdTitle')}</p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      {passwordValue && passwordValue.length >= 8 ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={passwordValue && passwordValue.length >= 8 ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdLength')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[A-Z]/.test(passwordValue || '') ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[A-Z]/.test(passwordValue || '') ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdUppercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[a-z]/.test(passwordValue || '') ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[a-z]/.test(passwordValue || '') ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdLowercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[0-9]/.test(passwordValue || '') ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[0-9]/.test(passwordValue || '') ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdNumber')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[@#$%^&*!]/.test(passwordValue || '') ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[@#$%^&*!]/.test(passwordValue || '') ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdSpecial')}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="label">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="new-password"
                    className={cn('input icon-input-both pe-10 ps-10', errors.confirmPassword && 'input-error')}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.confirmPassword.message || '')}
                  </p>
                )}
              </div>

              {/* Form Error */}
              {formError && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-800">{formError}</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {t('resetBtn')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
