import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { locale } = body

    if (!locale || !['ar', 'en', 'fr'].includes(locale)) {
      return NextResponse.json(
        { success: false, message: 'invalidLocale' },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set('locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Set locale error:', error)
    return NextResponse.json(
      { success: false, message: 'internalError' },
      { status: 500 }
    )
  }
}
