import type { NextAuthConfig } from 'next-auth';

// Edge-safe config: no Node.js-only modules (no bcryptjs, no DB adapter)
// Used by middleware.ts which runs on the Edge Runtime
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname.startsWith('/auth/') ||
        nextUrl.pathname.startsWith('/api/auth');

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
