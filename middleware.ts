import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Use edge-safe config (no Node.js modules) for the middleware
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron).*)'],
};
