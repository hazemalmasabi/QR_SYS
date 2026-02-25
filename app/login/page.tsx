'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Hotel,
  LogIn,
  ArrowLeft,
} from 'lucide-react'
import { loginUnifiedSchema } from '@/lib/validations'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type LoginUnifiedInput = z.infer<typeof loginUnifiedSchema>

export default function LoginPage() {
  const t = useTranslations('auth.login')
  const tv = useTranslations('validation')
  const locale = useLocale()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginUnifiedInput>({
    resolver: zodResolver(loginUnifiedSchema),
    defaultValues: { identifier: '', password: '' },
  })

  const resolveValidation = (key: string) => {
    const map: Record<string, string> = {
      required: tv('required'),
      invalidEmail: tv('invalidEmail'),
    }
    return map[key] || key
  }

  const onSubmit = async (data: LoginUnifiedInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()

      if (!res.ok) {
        const errorKey = result.error as string
        const errorMap: Record<string, string> = {
          INVALID_CREDENTIALS: t('invalidCredentials'),
          ACCOUNT_DISABLED: t('accountDisabled'),
          EMAIL_NOT_VERIFIED: t('emailNotVerified'),
        }
        toast.error(errorMap[errorKey] || result.message || t('invalidCredentials'))
        return
      }

      router.push('/dashboard')
    } catch {
      toast.error(t('invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <Link href="/" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {locale === 'ar' ? 'الرئيسية' : 'Home'}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <img src="/icon.png" alt="QR SYS" className="mx-auto mb-4 h-14 w-14 rounded-xl object-cover" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Unified Login Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Identifier: Email or Username */}
            <div>
              <label htmlFor="identifier" className="label">
                {t('identifier')}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  className={cn(
                    'input icon-input ps-10',
                    form.formState.errors.identifier && 'input-error'
                  )}
                  {...form.register('identifier')}
                  placeholder={t('identifierPlaceholder') || t('identifier')}
                />
              </div>
              {form.formState.errors.identifier && (
                <p className="mt-1 text-xs text-red-500">
                  {resolveValidation(form.formState.errors.identifier.message || '')}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  dir="ltr"
                  className={cn(
                    'input icon-input-both pe-10 ps-10',
                    form.formState.errors.password && 'input-error'
                  )}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {resolveValidation(form.formState.errors.password.message || '')}
                </p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
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
                <LogIn className="h-4 w-4" />
              )}
              {t('loginBtn')}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            {t('registerHotel')}
          </Link>
        </p>

      </div>
    </div>
  )
}
