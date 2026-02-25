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
    if (!token) {
      toast.error(tv('required'))
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
        toast.error(result.message || tv('required'))
      }
    } catch {
      toast.error(tv('required'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
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
                    className={cn('input pe-10 ps-10', errors.password && 'input-error')}
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

                {/* Strength Meter */}
                {passwordValue && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{tReg('passwordStrength')}</span>
                      <span className="text-xs font-medium">{strengthLabel()}</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full transition-colors duration-200',
                            i <= strength.score ? strengthColor() : 'bg-gray-200'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
                    className={cn('input pe-10 ps-10', errors.confirmPassword && 'input-error')}
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
