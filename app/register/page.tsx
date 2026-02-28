'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Controller } from 'react-hook-form'
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
  Info,
  CheckCircle2,
  UserPlus,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react'
import { registerSchema } from '@/lib/validations'
import type { RegisterInput } from '@/lib/validations'
import { cn, TIMEZONES, CURRENCIES } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface FormRegisterInput extends RegisterInput {
  customTzSign?: '+' | '-'
  customTzHours?: string
  customTzMinutes?: string
}

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const tv = useTranslations('validation')
  const locale = useLocale()
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [matchingTimezones, setMatchingTimezones] = useState<{ value: string, label: any }[]>([])
  const [isTimezoneVerified, setIsTimezoneVerified] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitted },
  } = useForm<FormRegisterInput>({
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
      customTzSign: '+',
      customTzHours: '00',
      customTzMinutes: '00',
    },
  })

  const passwordValue = watch('password') || ''
  const selectedTz = watch('timezone')
  const customSign = watch('customTzSign')
  const customHrs = watch('customTzHours')
  const customMins = watch('customTzMinutes')

  const getOffsetMinutes = (offsetStr: string) => {
    if (offsetStr === 'GMT' || offsetStr === 'UTC') return 0;
    const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const hours = parseInt(match[2], 10) || 0;
    const mins = parseInt(match[3], 10) || 0;
    return sign * (hours * 60 + mins);
  }

  const handleVerifyTimezone = () => {
    const userOffsetMinutes = ((customSign || '+') === '+' ? 1 : -1) * (parseInt(customHrs || '00', 10) * 60 + parseInt(customMins || '00', 10))
    const matches = TIMEZONES.filter(tz => getOffsetMinutes(tz.offset) === userOffsetMinutes)

    clearErrors('timezone')
    setIsTimezoneVerified(true)

    if (matches.length > 0) {
      setMatchingTimezones(matches)
      setVerificationMessage(locale === 'ar' ? 'تنبيه: يوجد دول مطابقة لنطاقك الزمني، "يجب" اختيار إحداها من القائمة بالأسفل للاستمرار.' : 'Alert: Matching timezones found, you "must" select one from the list below to continue.')
    } else {
      setMatchingTimezones([])
      setVerificationMessage(locale === 'ar' ? 'تم التحقق بنجاح لعدم وجود دول مطابقة، سيتم اعتماد توقيتك.' : 'Successfully verified: No matching countries found, your custom offset will be used.')
    }
  }

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
      verificationRequired: locale === 'ar' ? 'يرجى التحقق من التوقيت' : 'Verification required',
      matchRequired: locale === 'ar' ? 'يجب اختيار دولة مطابقة' : 'Must select a match',
    }
    return map[key] || key
  }

  // Effect to sync timezone errors if validation passes Zod but fails custom logic
  useEffect(() => {
    if (isSubmitted && selectedTz === 'OTHER') {
      if (!isTimezoneVerified) {
        setError('timezone', { type: 'manual', message: 'verificationRequired' });
      } else if (matchingTimezones.length > 0) {
        setError('timezone', { type: 'manual', message: 'matchRequired' });
      } else {
        clearErrors('timezone');
      }
    } else if (isSubmitted && selectedTz !== 'OTHER') {
      // Just let Zod handle it if it's not OTHER, or clear manual errors
      if (errors.timezone?.type === 'manual') {
        clearErrors('timezone');
      }
    }
  }, [isSubmitted, selectedTz, isTimezoneVerified, matchingTimezones.length, setError, clearErrors, errors.timezone?.type]);

  const onSubmit = async (data: FormRegisterInput) => {
    setLoading(true)
    try {
      // Handle the 'OTHER' timezone scenario
      let finalTimezone = data.timezone;
      if (finalTimezone === 'OTHER') {
        if (!isTimezoneVerified) {
          setError('timezone', { type: 'manual', message: locale === 'ar' ? 'يرجى التحقق من التوقيت أولاً' : 'Please verify timezone first' })
          toast.error(locale === 'ar' ? 'يرجى التحقق من التوقيت الزمني المخصص' : 'Please verify your custom timezone offset')
          setLoading(false)
          return
        }

        if (matchingTimezones.length > 0) {
          setError('timezone', { type: 'manual', message: locale === 'ar' ? 'يجب اختيار دولة مطابقة' : 'Must select a matching country' })
          toast.error(locale === 'ar' ? 'يوجد دول مطابقة لنطاقك الزمني، يرجى اختيار إحداها للاستمرار' : 'Matching countries found, please select one to continue')
          setLoading(false)
          return
        }

        finalTimezone = `GMT${data.customTzSign}${data.customTzHours}:${data.customTzMinutes}`
      }

      const payload: any = { ...data, timezone: finalTimezone, lang: locale }
      delete payload.customTzSign
      delete payload.customTzHours
      delete payload.customTzMinutes

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!res.ok) {
        if (result.message === 'emailTaken' || result.error === 'EMAIL_TAKEN') {
          setError('email', { type: 'manual', message: tv('emailTaken') }, { shouldFocus: true })
        } else {
          toast.error(tv('required'))
        }
        return
      }

      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      toast.error(locale === 'ar' ? 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً' : 'An unexpected error occurred, please try again later')
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
                    {t('hotelNameEn')}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="timezone" className="label mb-0">
                      {t('timezone')}
                    </label>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full mb-2 hidden w-64 rounded bg-gray-800 p-2 text-xs text-white group-hover:block z-50 ltr:right-0 rtl:left-0 shadow-lg border border-gray-700">
                        {locale === 'ar' ? 'هذا الحقل لتحديد توقيت الفندق المحلي. إذا لم تجد توقيتك في القائمة، يمكنك اختيار "أخرى" وتحديد فرق التوقيت مقارنة بخط جرينتش يدوياً.' : 'This field is to set the local hotel timezone. If you cannot find yours, select "Other" to set the GMT offset manually.'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-gray-400" />
                    <Controller
                      name="timezone"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={TIMEZONES}
                          value={field.value}
                          onChange={(v) => {
                            field.onChange(v)
                            // Reset verification state when timezone changes
                            if (v === 'OTHER') {
                              setIsTimezoneVerified(false)
                              setMatchingTimezones([])
                              setVerificationMessage(null)
                            }
                          }}
                          locale={locale}
                          placeholder={locale === 'ar' ? 'اختر التوقيت الزمني...' : 'Select timezone...'}
                          searchPlaceholder={locale === 'ar' ? 'ابحث عن مدينة أو توقيت...' : 'Search city or timezone...'}
                          noResultsText={locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                          error={!!errors.timezone}
                          hasIcon={true}
                          showOtherOption={true}
                          otherLabel={locale === 'ar' ? 'أخرى (تحديد مخصص)' : 'Other (Custom Offset)'}
                        />
                      )}
                    />
                  </div>
                  {errors.timezone && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.timezone.message || '')}
                    </p>
                  )}
                </div>

                {/* Currency */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="currency" className="label mb-0">
                      {t('currency')}
                    </label>
                    <div className="group relative">
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full mb-2 hidden w-64 rounded bg-gray-800 p-2 text-xs text-white group-hover:block z-50 ltr:right-0 rtl:left-0 shadow-lg border border-gray-700">
                        {locale === 'ar' ? 'حدد عملة الفندق لإظهارها بجانب طلبات الغرف. يمكنك اختيار "أخرى" لعرض المبالغ كأرقام فقط بدون رمز بجانبها.' : 'Determine your hotel currency for room orders. Select "Other" to show amounts purely as numbers.'}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Coins className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 z-10 text-gray-400" />
                    <Controller
                      name="currencyCode"
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
                          value={field.value}
                          onChange={field.onChange}
                          locale={locale}
                          placeholder={locale === 'ar' ? 'اختر العملة...' : 'Select currency...'}
                          searchPlaceholder={locale === 'ar' ? 'ابحث عن عملة...' : 'Search currency...'}
                          noResultsText={locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                          error={!!errors.currencyCode}
                          hasIcon={true}
                          showOtherOption={true}
                          otherLabel={locale === 'ar' ? 'أخرى (بدون رمز)' : 'Other (No Symbol)'}
                        />
                      )}
                    />
                  </div>
                  {errors.currencyCode && (
                    <p className="mt-1 text-xs text-red-500">
                      {resolveValidation(errors.currencyCode.message || '')}
                    </p>
                  )}
                </div>

                {/* Custom Timezone Configuration - Spans both columns if OTHER is selected */}
                {selectedTz === 'OTHER' && (
                  <div className="sm:col-span-2">
                    <div className={cn(
                      "flex flex-col gap-3 p-4 rounded-lg border transition-all",
                      errors.timezone ? "border-red-300 bg-red-50/30 ring-1 ring-red-100" : "bg-gray-50 border-gray-200"
                    )}>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-gray-700">
                              {locale === 'ar' ? 'نطاق جرينتش المخصص:' : 'Custom GMT Offset:'}
                            </span>
                            <span className="text-xs text-gray-500 font-medium leading-relaxed max-w-[200px]">
                              {locale === 'ar' ? 'حدد التوقيت بدقة للمقارنة بخط غرينتش' : 'Set the exact time relative to GMT'}
                            </span>
                          </div>

                          <div className="flex items-end justify-between sm:justify-end w-full sm:w-auto gap-1 sm:gap-2" dir="ltr">
                            <div className="flex items-center pb-2 shrink-0">
                              <span className="text-sm font-bold text-gray-400">GMT</span>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <span className="text-[10px] text-center text-gray-500 font-medium">{locale === 'ar' ? 'إشارة' : '+ / -'}</span>
                              <select
                                {...register('customTzSign')}
                                className={cn(
                                  "input py-2 px-0 text-sm text-center bg-white appearance-none w-[44px]",
                                  (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                                )}
                                onChange={(e) => {
                                  setValue('customTzSign', e.target.value as '+' | '-');
                                  setIsTimezoneVerified(false);
                                  setVerificationMessage(null);
                                  clearErrors('timezone');
                                }}
                              >
                                <option value="+">+</option>
                                <option value="-">-</option>
                              </select>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <span className="text-[10px] text-center text-gray-500 font-medium">{locale === 'ar' ? 'ساعات' : 'HH'}</span>
                              <select
                                {...register('customTzHours')}
                                className={cn(
                                  "input py-2 px-0 text-sm text-center bg-white appearance-none w-[60px]",
                                  (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                                )}
                                onChange={(e) => {
                                  setValue('customTzHours', e.target.value);
                                  setIsTimezoneVerified(false);
                                  setVerificationMessage(null);
                                  clearErrors('timezone');
                                }}
                              >
                                {Array.from({ length: 15 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-col items-center justify-end pb-2 shrink-0">
                              <span className="font-bold text-gray-400">:</span>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <span className="text-[10px] text-center text-gray-500 font-medium">{locale === 'ar' ? 'دقائق' : 'MM'}</span>
                              <select
                                {...register('customTzMinutes')}
                                className={cn(
                                  "input py-2 px-0 text-sm text-center bg-white appearance-none w-[60px]",
                                  (errors.timezone && !isTimezoneVerified) && "border-red-400 ring-red-100"
                                )}
                                onChange={(e) => {
                                  setValue('customTzMinutes', e.target.value);
                                  setIsTimezoneVerified(false);
                                  setVerificationMessage(null);
                                  clearErrors('timezone');
                                }}
                              >
                                {['00', '15', '30', '45'].map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end border-t border-gray-200 pt-3">
                          <button
                            type="button"
                            onClick={handleVerifyTimezone}
                            disabled={isTimezoneVerified}
                            className={cn(
                              "inline-flex shrink-0 w-full sm:w-auto items-center justify-center rounded-md text-sm font-medium border px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all",
                              isTimezoneVerified
                                ? "bg-green-50 border-green-200 text-green-700 focus:ring-green-500"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500"
                            )}
                          >
                            {isTimezoneVerified
                              ? (locale === 'ar' ? 'تم التحقق بنجاح' : 'Verified Successfully')
                              : (locale === 'ar' ? 'التحقق والمقارنة' : 'Verify Timezone')
                            }
                          </button>
                        </div>
                      </div>

                      {verificationMessage && (
                        <div className="mt-1 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-md">
                          {verificationMessage}
                        </div>
                      )}

                      {isTimezoneVerified && matchingTimezones.length > 0 && (
                        <div className="mt-1 pt-1">
                          <select
                            className={cn(
                              "input w-full bg-white text-sm",
                              errors.timezone ? "border-red-500 ring-1 ring-red-100" : "border-blue-400 ring-1 ring-blue-100"
                            )}
                            onChange={(e) => {
                              if (e.target.value) {
                                setValue('timezone', e.target.value, { shouldValidate: true })
                                setMatchingTimezones([])
                                setVerificationMessage(null)
                                clearErrors('timezone')
                              }
                            }}
                          >
                            <option value="">{locale === 'ar' ? '--- اختر دولة مطابقة (إجباري) ---' : '--- Select a matching country (Required) ---'}</option>
                            {matchingTimezones.map(tz => (
                              <option key={tz.value} value={tz.value}>
                                {typeof tz.label === 'string' ? tz.label : tz.label[locale as 'ar' | 'en']}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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

                {/* Password Requirements Checklist */}
                <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">{tv('pwdTitle')}</p>
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      {passwordValue.length >= 8 ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={passwordValue.length >= 8 ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdLength')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[A-Z]/.test(passwordValue) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[A-Z]/.test(passwordValue) ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdUppercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[a-z]/.test(passwordValue) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[a-z]/.test(passwordValue) ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdLowercase')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[0-9]/.test(passwordValue) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[0-9]/.test(passwordValue) ? 'text-gray-900' : 'text-gray-500'}>
                        {tv('pwdNumber')}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {/[@#$%^&*!]/.test(passwordValue) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      <span className={/[@#$%^&*!]/.test(passwordValue) ? 'text-gray-900' : 'text-gray-500'}>
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
