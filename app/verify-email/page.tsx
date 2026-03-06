'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Mail,
  MailCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verifyEmail')
  const tForgot = useTranslations('auth.forgotPassword')
  const locale = useLocale()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lang: locale }),
      })

      if (res.ok) {
        toast.success(t('subtitle'))
        setCooldown(60)
      } else {
        const result = await res.json()
        toast.error(result.message || t('invalid'))
      }
    } catch {
      toast.error(t('invalid'))
    } finally {
      setResending(false)
    }
  }, [cooldown, resending, email, locale, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher variant="dropdown" />
      </div>

      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
          <MailCheck className="h-10 w-10 text-primary-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>

        {/* Email Display */}
        {email && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
            <Mail className="h-4 w-4" />
            <span dir="ltr">{email}</span>
          </div>
        )}

        {/* Card */}
        <div className="card mt-6 text-start">
          <p className="text-sm text-gray-600">{t('checkEmail')}</p>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-700">{t('validFor')}</p>
          </div>

          {/* Tips */}
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">{t('tips')}</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                {t('checkSpam')}
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                {t('checkCorrect')}
              </li>
            </ul>
          </div>
        </div>

        {/* Resend */}
        <div className="mt-6">
          <p className="mb-3 text-sm text-gray-500">{t('noEmail')}</p>
          {cooldown > 0 ? (
            <p className="text-sm text-gray-400">
              {t('resendIn')}{' '}
              <span className="font-medium text-primary-600">{cooldown}</span>{' '}
              {t('seconds')}
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn-primary"
            >
              {resending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('resend')}
            </button>
          )}
        </div>

        {/* Back */}
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {tForgot('backToLogin')}
        </Link>
      </div>
    </div>
  )
}
