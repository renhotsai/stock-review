import LookupClient from './LookupClient';
import Link from 'next/link';

export default function LookupPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            首頁
          </Link>
          <span>/</span>
          <span>查詢</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{ticker}</span>
        </nav>
        <Link
          href={`/stocks/new?symbol=${ticker}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增股票
        </Link>
      </div>
      <LookupClient ticker={ticker} />
    </div>
  );
}
