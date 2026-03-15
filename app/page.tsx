'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  QrCode,
  Activity,
  Languages,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LandingPage() {
  const t = useTranslations('landing')

  const features = [
    { key: 'qr', icon: QrCode, color: 'from-blue-500 to-blue-600', image: '/images/landing/qr_scan_customer.png' },
    { key: 'realtime', icon: Activity, color: 'from-emerald-500 to-emerald-600', image: '/images/landing/feature_realtime.png' },
    { key: 'multilang', icon: Languages, color: 'from-violet-500 to-violet-600', image: '/images/landing/feature_multilang.png' },
    { key: 'reports', icon: BarChart3, color: 'from-amber-500 to-amber-600', image: '/images/landing/feature_reports.png' },
    { key: 'management', icon: Settings, color: 'from-rose-500 to-rose-600', image: '/images/landing/feature_management.png' },
    { key: 'security', icon: ShieldCheck, color: 'from-cyan-500 to-cyan-600', image: '/images/landing/feature_security.png' },
  ]

  const steps = [
    { key: 'step1', num: 1, image: '/images/landing/qr_scan_customer.png' },
    { key: 'step2', num: 2, image: '/images/landing/hiw_step2.png' },
    { key: 'step3', num: 3, image: '/images/landing/hiw_step3.png' },
    { key: 'step4', num: 4, image: '/images/landing/hiw_step4.png' },
  ]

  const qrTypes = [
    { key: 'customerScan', image: '/images/landing/qr_scan_customer.png' },
    { key: 'tableTent', image: '/images/landing/qr_type_table_tent.png' },
    { key: 'wallDisplay', image: '/images/landing/qr_type_wall_display.png' },
    { key: 'doorSticker', image: '/images/landing/qr_type_door_sticker.png' },
  ]

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Image src="/icon.png" alt="QR SYS" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-lg font-bold text-gray-900">QR SYS</span>
          </div>

          {/* Nav Links - hidden on mobile */}
          <nav className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => scrollTo('features')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 whitespace-nowrap"
            >
              {t('features.title')}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 whitespace-nowrap">
                {t('moreOptions')} <ChevronDown className="h-4 w-4" />
              </button>
              <div className="absolute top-full ltr:right-0 rtl:left-0 pt-1 hidden group-hover:block z-50">
                <div className="flex w-48 flex-col rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => scrollTo('how-it-works')}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ltr:text-left rtl:text-right hover:bg-gray-50 hover:text-blue-600"
                  >
                    {t('howItWorks.title')}
                  </button>
                  <button
                    onClick={() => scrollTo('qr-types')}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ltr:text-left rtl:text-right hover:bg-gray-50 hover:text-blue-600"
                  >
                    {t('qrTypes.title')}
                  </button>

                  <Link
                    href="/help"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 ltr:text-left rtl:text-right hover:bg-gray-50 hover:text-blue-600 block w-full"
                  >
                    {t('help')}
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="dropdown" />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-4 whitespace-nowrap"
            >
              {t('hero.loginBtn')}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 sm:px-5 whitespace-nowrap"
            >
              {t('hero.registerBtn')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTAgMzR2LTJoMnYyaC0yek0wIDBoMnYyaC0ydi0yem0zNiAwaC0ydjJoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="text-center lg:col-span-7 lg:text-start lg:ltr:text-left lg:rtl:text-right">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <QrCode className="h-4 w-4" />
                <span>QR SYS</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t('hero.title')}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-blue-100 sm:text-xl">
                {t('hero.subtitle')}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center lg:justify-start lg:ltr:justify-start lg:rtl:justify-start gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-xl transition-all hover:bg-blue-50 hover:shadow-2xl sm:w-auto"
                >
                  {t('hero.registerBtn')}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
                >
                  {t('hero.loginBtn')}
                </Link>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:col-span-5 lg:max-w-none h-[350px] lg:h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-white/20 lg:block">
              <Image src="/images/landing/qr_scan_customer.png" fill alt="Customer scanning QR Code" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 to-transparent" />
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center">
            <button
              onClick={() => scrollTo('features')}
              className="animate-bounce text-white/60 transition-colors hover:text-white"
              aria-label={t('scrollDown')}
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t('features.title')}
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-700" />
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ key, image }) => (
              <div
                key={key}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                  <Image src={image} fill alt={t(`features.${key}.title`)} className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="mb-3 text-xl font-bold text-gray-900">
                    {t(`features.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500 text-balance">
                    {t(`features.${key}.desc`)}
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 h-1.5 w-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="scroll-mt-20 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t('howItWorks.title')}
            </h2>
            <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ key, num, image }) => (
              <div key={key} className="relative flex flex-col items-center text-center group">
                {/* Connector line (hidden on first item and mobile) */}
                {num > 1 && (
                  <div className="absolute top-24 hidden w-full -translate-x-1/2 lg:block ltr:right-1/2 rtl:left-1/2">
                    <div className="h-0.5 w-full border-t-2 border-dashed border-gray-200" />
                  </div>
                )}

                {/* Circular Image Container */}
                <div className="relative z-10 w-full max-w-[200px] aspect-square rounded-full overflow-hidden bg-gray-100 shadow-lg border-4 border-white mb-2 transition-transform duration-300 group-hover:-translate-y-2">
                  <Image src={image} fill alt={t(`howItWorks.${key}.title`)} className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                </div>

                {/* Step Number Badge */}
                <div className="relative z-20 mb-4 -mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-lg border-4 border-white">
                  {num}
                </div>

                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {t(`howItWorks.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500 px-4 text-balance">
                  {t(`howItWorks.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR Types Section */}
      <section id="qr-types" className="scroll-mt-20 py-20 sm:py-28 bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {t('qrTypes.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">{t('qrTypes.desc')}</p>
            <div className="mx-auto mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {qrTypes.map(({ key, image }) => (
              <div key={key} className="group relative overflow-hidden rounded-2xl shadow-lg border border-gray-100 bg-gray-50">
                <div className="relative h-64 w-full bg-gray-200">
                  <Image src={image} fill alt={t(`qrTypes.${key}.title`)} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-center transform transition-transform duration-300">
                  <h3 className="text-xl font-bold mb-2">{t(`qrTypes.${key}.title`)}</h3>
                  <p className="text-sm text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-2 group-hover:translate-y-0 text-balance filter drop-shadow-md">{t(`qrTypes.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 py-20 sm:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6TTAgMzR2LTJoMnYyaC0yek0wIDBoMnYyaC0ydi0yem0zNiAwaC0ydjJoMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t('hero.title')}
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-xl transition-all hover:bg-blue-50 hover:shadow-2xl sm:w-auto"
            >
              {t('hero.registerBtn')}
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 sm:w-auto"
            >
              {t('hero.loginBtn')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5">
                <Image src="/icon.png" alt="QR SYS" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                <span className="text-lg font-bold text-gray-900">QR SYS</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                {t('hero.subtitle')}
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="mb-4 text-sm font-semibold text-gray-900">
                {t('footer.quickLinks')}
              </h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <li>
                  <button onClick={() => scrollTo('features')} className="text-sm text-gray-500 transition-colors hover:text-blue-600 ltr:text-left rtl:text-right w-full">
                    {t('features.title')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('how-it-works')} className="text-sm text-gray-500 transition-colors hover:text-blue-600 ltr:text-left rtl:text-right w-full">
                    {t('howItWorks.title')}
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('qr-types')} className="text-sm text-gray-500 transition-colors hover:text-blue-600 ltr:text-left rtl:text-right w-full">
                    {t('qrTypes.title')}
                  </button>
                </li>

                <li>
                  <Link href="/help" className="text-sm text-gray-500 transition-colors hover:text-blue-600 ltr:text-left rtl:text-right w-full block">
                    {t('help')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-6 text-center">
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} QR SYS. {t('footer.rights')}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
