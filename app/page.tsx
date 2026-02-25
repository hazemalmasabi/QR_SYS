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
  ScanLine,
  ConciergeBell,
  ShoppingCart,
  Truck,
  Hotel,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function LandingPage() {
  const t = useTranslations('landing')

  const features = [
    { key: 'qr', icon: QrCode, color: 'from-blue-500 to-blue-600' },
    { key: 'realtime', icon: Activity, color: 'from-emerald-500 to-emerald-600' },
    { key: 'multilang', icon: Languages, color: 'from-violet-500 to-violet-600' },
    { key: 'reports', icon: BarChart3, color: 'from-amber-500 to-amber-600' },
    { key: 'management', icon: Settings, color: 'from-rose-500 to-rose-600' },
    { key: 'security', icon: ShieldCheck, color: 'from-cyan-500 to-cyan-600' },
  ]

  const steps = [
    { key: 'step1', icon: ScanLine, num: 1 },
    { key: 'step2', icon: ConciergeBell, num: 2 },
    { key: 'step3', icon: ShoppingCart, num: 3 },
    { key: 'step4', icon: Truck, num: 4 },
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
          <div className="flex items-center gap-2.5">
            <img src="/icon.png" alt="QR SYS" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-lg font-bold text-gray-900">QR SYS</span>
          </div>

          {/* Nav Links - hidden on mobile */}
          <nav className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => scrollTo('features')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {t('features.title')}
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {t('howItWorks.title')}
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-4"
            >
              {t('hero.loginBtn')}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 sm:px-5"
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

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <QrCode className="h-4 w-4" />
            <span>QR SYS</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-blue-100 sm:text-xl">
            {t('hero.subtitle')}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
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

          {/* Scroll indicator */}
          <button
            onClick={() => scrollTo('features')}
            className="mt-16 animate-bounce text-white/60 transition-colors hover:text-white"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
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

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={cn(
                    'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg',
                    color
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {t(`features.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {t(`features.${key}.desc`)}
                </p>
                {/* Hover accent */}
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 group-hover:w-full" />
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
            {steps.map(({ key, icon: Icon, num }) => (
              <div key={key} className="relative flex flex-col items-center text-center">
                {/* Connector line (hidden on first item and mobile) */}
                {num > 1 && (
                  <div className="absolute top-10 hidden w-full -translate-x-1/2 lg:block ltr:right-1/2 rtl:left-1/2">
                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-200 to-blue-400 rtl:bg-gradient-to-l" />
                  </div>
                )}

                {/* Step number circle */}
                <div className="relative z-10 mb-6 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl">
                  <span className="text-2xl font-bold text-white">{num}</span>
                </div>

                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mb-2 text-base font-semibold text-gray-900">
                  {t(`howItWorks.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {t(`howItWorks.${key}.desc`)}
                </p>
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
                <img src="/icon.png" alt="QR SYS" className="h-9 w-9 rounded-lg object-cover" />
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
              <ul className="space-y-2.5">
                <li>
                  <button
                    onClick={() => scrollTo('features')}
                    className="text-sm text-gray-500 transition-colors hover:text-blue-600"
                  >
                    {t('features.title')}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo('how-it-works')}
                    className="text-sm text-gray-500 transition-colors hover:text-blue-600"
                  >
                    {t('howItWorks.title')}
                  </button>
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
