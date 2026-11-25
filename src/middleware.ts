import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  // 1. Protect Admin Routes (/admin and all subpaths)
  if (pathname.startsWith('/admin')) {
    if (!session || session.role !== 'ADMIN') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Protect Affiliate Portal Routes (/affiliate and all subpaths)
  if (pathname.startsWith('/affiliate')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    // Admins may inspect the affiliate portal
    if (session.role === 'ADMIN') {
      return NextResponse.next();
    }

    // Allow authenticated non-active affiliates on the dedicated status page (avoid redirect loop)
    if (pathname === '/affiliate/status') {
      return NextResponse.next();
    }

    // User signed in with Google but hasn't submitted affiliate onboarding yet
    if (!session.affiliateId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('step', 'onboarding');
      return NextResponse.redirect(loginUrl);
    }

    // Non-active affiliates (UNVERIFIED, PENDING, REJECTED, SUSPENDED) -> dedicated status screen
    if (session.affiliateStatus !== 'ACTIVE') {
      const statusUrl = new URL('/affiliate/status', request.url);
      return NextResponse.redirect(statusUrl);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/affiliate/:path*'],
};
