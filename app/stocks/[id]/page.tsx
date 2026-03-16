import { sql } from '@/lib/db';
import type { Stock } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StockDetailClient from './StockDetailClient';

export const revalidate = 0;

export default async function StockDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const [stock] = (await sql`SELECT * FROM stocks WHERE id = ${id}`) as Stock[];
  if (!stock) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">首頁</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{stock.symbol}</span>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{stock.symbol}</h1>
          {stock.name && <p className="text-gray-500 text-sm mt-0.5">{stock.name}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/stocks/${stock.id}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            編輯
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            ← 返回
          </Link>
        </div>
      </div>

      <StockDetailClient stock={stock} />
    </div>
  );
}
