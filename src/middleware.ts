import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password'];

// Paths that are always accessible
const alwaysAccessiblePaths = ['/_next', '/api', '/favicon.ico', '/images'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow always accessible paths
  if (alwaysAccessiblePaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies or localStorage (via cookie)
  const token = request.cookies.get('accessToken')?.value;

  // If accessing public path and already authenticated, redirect to dashboard
  if (publicPaths.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If accessing protected path without token, redirect to login
  if (!publicPaths.includes(pathname) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
