import { getRequestConfig } from 'next-intl/server'
// Trigger cache invalidation for Turbopack
import { cookies } from 'next/headers'
import { defaultLocale } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
