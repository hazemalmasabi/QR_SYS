'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import Link from 'next/link'
import { z } from 'zod'
import {
  Mail,
  ArrowLeft,
  Send,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const forgotPasswordSchema = z.object({
  email: z.string().email('invalidEmail'),
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword')
  const tv = useTranslations('validation')
  const tc = useTranslations('common')
  const locale = useLocale()

  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const resolveValidation = (key: string) => {
    const map: Record<string, string> = {
      required: tv('required'),
      invalidEmail: tv('invalidEmail'),
    }
    return map[key] || key
  }

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: locale }),
      })

      if (res.ok) {
        setSent(true)
        toast.success(t('sent'))
      } else {
        const result = await res.json()
        const errorKey = result.message || 'required'
        const errorMap: Record<string, string> = {
          emailNotFound: t('emailNotFound'),
          emailRequired: tv('required'),
          internalError: tv('required'),
        }
        setServerError(errorMap[errorKey] || t('emailNotFound'))
      }
    } catch {
      setServerError(t('emailNotFound'))
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
          {sent ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Send className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">{t('sent')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Admin only notice */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {t('adminWarning')}
              </div>
              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  {t('email')}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    className={cn('input icon-input ps-10', errors.email && 'input-error')}
                    placeholder="example@hotel.com"
                    {...register('email', {
                      onChange: () => setServerError(null)
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.email.message || '')}
                  </p>
                )}
              </div>

              {/* Server Error Message */}
              {serverError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 text-center justify-center">
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
                  <Send className="h-4 w-4" />
                )}
                {t('sendBtn')}
              </button>
            </form>
          )}
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
