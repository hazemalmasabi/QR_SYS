'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Hotel,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Coins,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
} from 'lucide-react'
import { registerSchema } from '@/lib/validations'
import type { RegisterInput } from '@/lib/validations'
import { cn, getPasswordStrength, TIMEZONES, CURRENCIES } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const tv = useTranslations('validation')
  const locale = useLocale()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      hotelName: '',
      hotelNameEn: '',
      timezone: '',
      currencyCode: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false as unknown as true,
    },
  })

  const passwordValue = watch('password')
  const strength = getPasswordStrength(passwordValue || '')

  const resolveValidation = (key: string) => {
    const map: Record<string, string> = {
      required: tv('required'),
      invalidEmail: tv('invalidEmail'),
      min3: tv('minLength', { min: 3 }),
      max100: tv('maxLength', { max: 100 }),
      passwordMin: tv('passwordMin'),
      passwordRequirements: tv('passwordRequirements'),
      passwordMismatch: tv('passwordMismatch'),
      phoneInvalid: tv('phoneInvalid'),
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
        return t('weak')
      case 'medium':
        return t('medium')
      case 'strong':
        return t('strong')
      case 'veryStrong':
        return t('veryStrong')
      default:
        return ''
    }
  }

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: locale }),
      })
      const result = await res.json()

      if (!res.ok) {
        const errorKey = result.error as string
        if (errorKey === 'EMAIL_TAKEN') {
          toast.error(tv('emailTaken'))
        } else {
          toast.error(result.message || tv('required'))
        }
        return
      }

      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch {
      toast.error(tv('required'))
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

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <img src="/icon.png" alt="QR SYS" className="mx-auto mb-4 h-14 w-14 rounded-xl object-cover" />
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Hotel Info Section */}
          <div className="card mb-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Hotel className="h-5 w-5 text-primary-600" />
              {t('hotelInfo')}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Hotel Name (AR) */}
                <div>
                  <label htmlFor="hotelName" className="label">
                    {t('hotelName')}
                  </label>
                  <div className="relative">
                    <Hotel className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="hotelName"
                      type="text"
                      className={cn('input icon-input ps-10', errors.hotelName && 'input-error')}
                      {...register('hotelName')}
                    />
                  </div>
                  {errors.hotelName && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.hotelName.message || '')}
                    </p>
                  )}
                </div>

                {/* Hotel Name (EN) */}
                <div>
                  <label htmlFor="hotelNameEn" className="label">
                    Hotel Name (English)
                  </label>
                  <div className="relative">
                    <Hotel className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="hotelNameEn"
                      type="text"
                      dir="ltr"
                      className={cn('input icon-input ps-10', errors.hotelNameEn && 'input-error')}
                      {...register('hotelNameEn')}
                    />
                  </div>
                  {errors.hotelNameEn && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.hotelNameEn.message || '')}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Timezone */}
                <div>
                  <label htmlFor="timezone" className="label">
                    {t('timezone')}
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      id="timezone"
                      className={cn('input icon-input input-with-icon appearance-none ps-10', errors.timezone && 'input-error')}
                      {...register('timezone')}
                    >
                      <option value="">---</option>
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {locale === 'ar' ? tz.label.ar : tz.label.en}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.timezone && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.timezone.message || '')}
                    </p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="currency" className="label">
                    {t('currency')}
                  </label>
                  <div className="relative">
                    <Coins className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      id="currency"
                      className={cn('input icon-input input-with-icon appearance-none ps-10', errors.currencyCode && 'input-error')}
                      {...register('currencyCode')}
                    >
                      <option value="">---</option>
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {locale === 'ar' ? c.label.ar : c.label.en} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.currencyCode && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.currencyCode.message || '')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Supervisor Info Section */}
          <div className="card mb-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <User className="h-5 w-5 text-primary-600" />
              {t('supervisorInfo')}
            </h2>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="label">
                  {t('fullName')}
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    className={cn('input icon-input ps-10', errors.fullName && 'input-error')}
                    {...register('fullName')}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.fullName.message || '')}
                  </p>
                )}
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
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.email.message || '')}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="label">
                  {t('phone')}
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className={cn('input icon-input ps-10', errors.phone && 'input-error')}
                    placeholder="0500000000"
                    {...register('phone')}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">{t('phoneHint')}</p>
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.phone.message || '')}
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

                {/* Strength Meter */}
                {passwordValue && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t('passwordStrength')}</span>
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

              {/* Terms */}
              <div>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('agreeTerms')}
                  />
                  <span className="text-sm text-gray-600">{t('agreeTerms')}</span>
                </label>
                {errors.agreeTerms && (
                  <p className="mt-1 text-xs text-red-500">
                    {resolveValidation(errors.agreeTerms.message || '')}
                  </p>
                )}
              </div>
            </div>
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
              <UserPlus className="h-4 w-4" />
            )}
            {t('registerBtn')}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            {t('login')}
          </Link>
        </p>

      </div>
    </div>
  )
}
