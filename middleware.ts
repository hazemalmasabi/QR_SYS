import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = new TextEncoder().encode(
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret-key'
)

const publicPaths = ['/', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/guest']
const apiPublicPaths = ['/api/auth/register', '/api/auth/login', '/api/auth/verify-email', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/guest']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths, but redirect authenticated users from login/register
  const isAuthPage = pathname === '/login' || pathname === '/register'
  
  if (publicPaths.some(p => pathname === p || pathname.startsWith('/guest/'))) {
    if (isAuthPage) {
      const token = request.cookies.get('session')?.value
      if (token) {
        try {
          await jwtVerify(token, secretKey)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        } catch {
          // Token invalid, allow access to login/register
        }
      }
    }
    return NextResponse.next()
  }

  // Allow public API paths
  if (apiPublicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internal routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check session for dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('session')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token, secretKey)
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
