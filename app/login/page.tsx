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
  const tc = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

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
        const errorKey = result.message || 'invalidCredentials'
        const errorMap: Record<string, string> = {
          invalidCredentials: t('invalidCredentials'),
          accountDisabled: t('accountDisabled'),
          emailNotVerified: t('emailNotVerified'),
        }
        setServerError(errorMap[errorKey] || t('invalidCredentials'))
        return
      }

      if (result.locale) {
        document.cookie = `locale=${result.locale}; path=/; max-age=31536000; SameSite=Lax`
      }
      window.location.href = result.redirectUrl || '/dashboard'
    } catch {
      setServerError(t('invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <Link href="/" className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />
          {tc('home')}
        </Link>
        <LanguageSwitcher variant="dropdown" />
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
                  {...form.register('identifier', {
                    onChange: () => setServerError(null)
                  })}
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
                  {...form.register('password', {
                    onChange: () => setServerError(null)
                  })}
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                  {...form.register('rememberMe')}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {t('rememberMe')}
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>

            {/* Server Error Message */}
            {serverError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                {serverError}
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
