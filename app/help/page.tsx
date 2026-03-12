import HelpCenter from '@/components/help/HelpCenter'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function LandingHelpPage() {
    const t = useTranslations('common')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>{t('backToHome')}</span>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <LanguageSwitcher variant="dropdown" />
                        <Link
                            href="/login"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:px-4 whitespace-nowrap"
                        >
                            {t('signIn')}
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-2 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg hover:brightness-110 sm:px-5 whitespace-nowrap"
                        >
                            {t('signUp')}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-24 pb-20">
                <HelpCenter context="landing" />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="mx-auto max-w-7xl px-4 text-center">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} QR SYS. {t('rights')}.
                    </p>
                </div>
            </footer>
        </div>
    )
}
