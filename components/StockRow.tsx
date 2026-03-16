'use client';

import Link from 'next/link';
import { useStockPrice } from '@/hooks/useStockPrice';
import { calculateValuation, getPriceStatus } from '@/lib/valuation';
import PriceStatusBadge from './PriceStatusBadge';
import ScoreBadge from './ScoreBadge';
import type { Stock } from '@/lib/db';

interface StockRowProps {
  stock: Stock;
  onDelete: (id: number, symbol: string) => void;
  isDeleting: boolean;
}

export default function StockRow({ stock, onDelete, isDeleting }: StockRowProps) {
  const { data: priceData, isLoading: priceLoading } = useStockPrice(stock.symbol);
  const currentPrice = priceData?.price ?? null;

  const { fairValue, reviewValue, score } = calculateValuation(stock);
  const status = getPriceStatus(currentPrice, fairValue, reviewValue);

  const displayFairValue = fairValue ?? stock.entry_price;
  const displayReviewValue = reviewValue ?? stock.review_price;

  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
      status === 'undervalued' ? 'bg-green-50/40' : ''
    }`}>
      <td className="px-4 py-3">
        <Link
          href={`/stocks/${stock.id}`}
          className="font-bold text-blue-700 hover:text-blue-900 hover:underline"
        >
          {stock.symbol}
        </Link>
      </td>
      <td className="px-4 py-3 text-gray-700 text-sm">{stock.name ?? '—'}</td>
      <td className="px-4 py-3">
        {stock.type ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            stock.type === 'Growth' ? 'bg-blue-50 text-blue-700' :
            stock.type === 'Dividends' ? 'bg-green-50 text-green-700' :
            'bg-purple-50 text-purple-700'
          }`}>
            {stock.type}
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <ScoreBadge score={score} size="sm" />
      </td>
      <td className="px-4 py-3 text-right font-mono">
        {priceLoading ? (
          <span className="text-gray-400 text-xs">載入中…</span>
        ) : currentPrice != null ? (
          <span className={`font-semibold ${status === 'undervalued' ? 'text-green-700' : 'text-gray-900'}`}>
            ${currentPrice.toFixed(2)}
          </span>
        ) : (
          <span className="text-red-400 text-xs">N/A</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-700 text-sm">
        {displayFairValue != null ? `$${Number(displayFairValue).toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-500 text-sm">
        {displayReviewValue != null ? `$${Number(displayReviewValue).toFixed(2)}` : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <PriceStatusBadge status={status} />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/stocks/${stock.id}`}
            className="text-xs text-gray-500 hover:underline"
          >
            詳情
          </Link>
          <Link
            href={`/stocks/${stock.id}/edit`}
            className="text-xs text-blue-600 hover:underline"
          >
            編輯
          </Link>
          <button
            onClick={() => onDelete(stock.id, stock.symbol)}
            disabled={isDeleting}
            className="text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            {isDeleting ? '…' : '刪除'}
          </button>
        </div>
      </td>
    </tr>
  );
}
