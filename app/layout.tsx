import type { Metadata } from 'next';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';

export const metadata: Metadata = {
  title: 'BOS Stock Tracker',
  description: 'Monitor US stocks against fair entry prices using F.A.C.T.S methodology',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <QueryProvider>
          <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-blue-600">
              BOS Stock Tracker
            </a>
            <a
              href="/stocks/new"
              className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + 新增股票
            </a>
          </nav>
          <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
