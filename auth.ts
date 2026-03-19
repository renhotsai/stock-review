import NextAuth from 'next-auth';
import NeonAdapter from '@auth/neon-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return {
    adapter: NeonAdapter(pool),
    session: { strategy: 'jwt' },
    providers: [
      Google,
      Credentials({
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: '密碼', type: 'password' },
        },
        async authorize(credentials) {
          const email = credentials?.email as string;
          const password = credentials?.password as string;
          if (!email || !password) return null;

          const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
          const user = rows[0];
          if (!user?.password) return null;

          const valid = await bcrypt.compare(password, user.password as string);
          if (!valid) return null;

          return {
            id: String(user.id),
            email: user.email as string,
            name: user.name as string | null,
            image: user.image as string | null,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) token.id = user.id;
        return token;
      },
      async session({ session, token }) {
        if (token.id) session.user.id = token.id as string;
        return session;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  };
});
