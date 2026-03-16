'use client';

import type { Stock } from '@/lib/db';
import { calculateValuation, getPriceStatus } from '@/lib/valuation';
import PriceStatusBadge from './PriceStatusBadge';
import ScoreBadge from './ScoreBadge';

interface ValuationCardProps {
  stock: Stock;
  currentPrice: number | null;
}

export default function ValuationCard({ stock, currentPrice }: ValuationCardProps) {
  const { fairValue, reviewValue, score } = calculateValuation(stock);
  const status = getPriceStatus(currentPrice, fairValue, reviewValue);

  const rows = [
    { label: '現在股價', value: currentPrice != null ? `$${currentPrice.toFixed(2)}` : '—', highlight: true },
    { label: '合理買入價 (Fair Value)', value: fairValue != null ? `$${fairValue.toFixed(2)}` : '—' },
    { label: '重新估值 (Review)', value: reviewValue != null ? `$${reviewValue.toFixed(2)}` : '—' },
    { label: 'F.A.C.T.S 信心分數', value: <ScoreBadge score={score} size="sm" /> },
  ];

  const typeLabel =
    stock.type === 'Growth' ? 'EPS × Growth Rate' :
    stock.type === 'Dividends' ? 'Dividend ÷ Return Rate' :
    'BVPS × Discount Factor';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">估值摘要</h3>
          <p className="text-xs text-gray-500 mt-0.5">{stock.type} — {typeLabel}</p>
        </div>
        <PriceStatusBadge status={status} />
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{row.label}</span>
            <span className={`text-sm font-semibold ${row.highlight ? 'text-blue-700 text-base' : 'text-gray-900'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {stock.notes && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">備註</p>
          <p className="text-sm text-gray-700">{stock.notes}</p>
        </div>
      )}
    </div>
  );
}
