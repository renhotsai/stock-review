import type { Metadata, Viewport } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';
import { auth, signOut } from '@/auth';

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

  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <QueryProvider>
          <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-600">
              BOS Stock Tracker
            </a>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <>
                  <a
                    href="/stocks/new"
                    className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    + 新增股票
                  </a>
                  <span className="text-sm text-gray-600 hidden md:inline">
                    {session.user.name ?? session.user.email}
                  </span>
                  <form
                    action={async () => {
                      'use server';
                      await signOut({ redirectTo: '/auth/signin' });
                    }}
                  >
                    <button
                      type="submit"
                      className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      登出
                    </button>
                  </form>
                </>
              ) : (
                <a
                  href="/auth/signin"
                  className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  登入
                </a>
              )}
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
