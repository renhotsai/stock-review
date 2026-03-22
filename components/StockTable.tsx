'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StockRow from './StockRow';
import type { Stock } from '@/lib/db';
import { useTranslation } from '@/contexts/LanguageContext';

interface StockTableProps {
  stocks: Stock[];
}

export default function StockTable({ stocks }: StockTableProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDelete(id: number, symbol: string) {
    if (!confirm(t('stockTable.deleteConfirm', { symbol }))) return;
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
        <p className="text-lg mb-4">{t('stockTable.empty')}</p>
        <Link
          href="/stocks/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('stockTable.addFirst')}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left font-semibold text-gray-600">{t('stockTable.symbol')}</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">{t('stockTable.name')}</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">{t('stockTable.type')}</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600 hidden sm:table-cell">{t('stockTable.score')}</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">{t('stockTable.currentPrice')}</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden lg:table-cell">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 align-middle" />
              {t('stockTable.fairValue')}
            </th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600 hidden lg:table-cell">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1 align-middle" />
              {t('stockTable.reviewValue')}
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">{t('stockTable.status')}</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600">{t('stockTable.actions')}</th>
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
