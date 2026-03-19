import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth');

  if (!isPublic && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
};
