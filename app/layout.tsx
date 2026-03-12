import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { Toaster } from 'sonner'
import { getLanguageDirection } from '@/lib/languages'
import { cn } from '@/lib/utils'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()

  const titles: Record<string, string> = {
    ar: 'QR SYS - نظام إدارة الخدمات الفندقية',
    en: 'QR SYS - Hotel Services Management',
    fr: 'QR SYS - Gestion des Services Hôteliers',
    es: 'QR SYS - Gestión de Servicios Hoteleros',
  }

  const descriptions: Record<string, string> = {
    ar: 'نظام إدارة الخدمات الفندقية',
    en: 'Hotel Services Management System',
    fr: 'Système de gestion des services hôteliers',
    es: 'Sistema de gestión de servicios hoteleros',
  }

  const title = titles[locale] || titles.en
  const description = descriptions[locale] || descriptions.en

  return {
    title: {
      default: title,
      template: `%s | QR SYS`,
    },
    description,
    icons: {
      icon: '/icon.png',
      shortcut: '/icon.png',
      apple: '/icon.png',
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: '/icon.png', width: 512, height: 512, alt: 'QR SYS' }],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: ['/icon.png'],
    },
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const dir = getLanguageDirection(locale)
  return (
    <html lang={locale} dir={dir} className={cn(inter.variable, ibmPlexArabic.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 font-sans" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster
            position={dir === 'rtl' ? 'top-left' : 'top-right'}
            richColors
            dir={dir}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
