'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

type Status = 'loading' | 'success' | 'error'

export default function VerifyEmailConfirmPage() {
  const t = useTranslations('auth.verifyEmail')
  const tLogin = useTranslations('auth.login')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const statusParam = searchParams.get('status')

  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // If the URL has a status parameter, it means the backend API already did the verification and redirected here.
    if (statusParam === 'success') {
      setStatus('success')
    } else if (statusParam === 'expired') {
      setStatus('error')
      setErrorMessage(t('expired'))
    } else if (statusParam === 'error' || statusParam === 'invalid') {
      setStatus('error')
      setErrorMessage(t('invalid'))
    } else if (token) {
      // Fallback: if somehow the user lands here with a token directly, we try to verify it by redirecting to the API
      window.location.href = `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    } else {
      setStatus('error')
      setErrorMessage(t('invalid'))
    }
  }, [statusParam, token, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md text-center">
        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {/* Verifying... */}
            </p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-2 text-base text-green-600">{t('success')}</p>
            <Link href="/login" className="btn-primary mt-6 inline-flex">
              <LogIn className="h-4 w-4" />
              {tLogin('loginBtn')}
            </Link>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-2 text-base text-red-600">{errorMessage}</p>
            <Link href="/login" className="btn-primary mt-6 inline-flex">
              <LogIn className="h-4 w-4" />
              {tLogin('loginBtn')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
