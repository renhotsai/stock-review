import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import { auth, signOut } from '@/auth';
import { LanguageProvider } from '@/contexts/LanguageContext';
import NavActions from '@/components/NavActions';

export const metadata: Metadata = {
  title: 'BOS Stock Tracker',
  description: 'Monitor US stocks against fair entry prices using F.A.C.T.S methodology',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/auth/signin' });
  }

  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <LanguageProvider>
          <QueryProvider>
            <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-blue-600">
                BOS Stock Tracker
              </a>
              <NavActions
                userDisplay={session?.user?.name ?? session?.user?.email ?? null}
                isLoggedIn={!!session?.user}
                logoutAction={logoutAction}
              />
            </nav>
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
