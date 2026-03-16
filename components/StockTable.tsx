'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StockRow from './StockRow';
import type { Stock } from '@/lib/db';

interface StockTableProps {
  stocks: Stock[];
}

export default function StockTable({ stocks }: StockTableProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number, symbol: string) {
    if (!confirm(`確定要刪除 ${symbol} 嗎？`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/stocks/${id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  if (stocks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg mb-4">尚無股票，請先新增</p>
        <Link
          href="/stocks/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          新增第一支股票
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-600">股票代碼</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">名稱</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">類型</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">信心分數</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">現在股價</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">合理買入價</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">重新估值</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">狀態</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <StockRow
              key={stock.id}
              stock={stock}
              onDelete={handleDelete}
              isDeleting={deleting === stock.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
