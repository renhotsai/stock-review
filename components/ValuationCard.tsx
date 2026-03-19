'use client';

import type { Stock } from '@/lib/db';
import { calculateValuation, getPriceStatus } from '@/lib/valuation';
import PriceStatusBadge from './PriceStatusBadge';
import ScoreBadge from './ScoreBadge';

interface ValuationCardProps {
  stock: Stock;
  currentPrice: number | null;
}

const priceColorMap = {
  undervalued: 'text-green-700',
  fair:        'text-yellow-700',
  overvalued:  'text-red-700',
  unknown:     'text-blue-700',
};

export default function ValuationCard({ stock, currentPrice }: ValuationCardProps) {
  const { fairValue, reviewValue, score } = calculateValuation(stock);
  const status = getPriceStatus(currentPrice, fairValue, reviewValue);
  const priceColor = priceColorMap[status];

  // Price range bar math
  let rangeBar: { greenFlex: number; yellowFlex: number; redFlex: number; markerPct: number } | null = null;
  if (fairValue != null && reviewValue != null) {
    const min = fairValue * 0.7;
    const max = reviewValue * 1.3;
    const span = max - min;
    const fairPct = ((fairValue - min) / span) * 100;
    const reviewPct = ((reviewValue - min) / span) * 100;
    const markerPct = currentPrice != null
      ? Math.min(100, Math.max(0, ((currentPrice - min) / span) * 100))
      : -1;
    rangeBar = {
      greenFlex: fairPct,
      yellowFlex: reviewPct - fairPct,
      redFlex: 100 - reviewPct,
      markerPct,
    };
  }

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

      {rangeBar && (
        <div className="mb-5">
          <div className="relative h-2.5 flex rounded-full overflow-hidden mb-2">
            <div className="bg-green-200" style={{ flex: rangeBar.greenFlex }} />
            <div className="bg-yellow-200" style={{ flex: rangeBar.yellowFlex }} />
            <div className="bg-red-200" style={{ flex: rangeBar.redFlex }} />
            {rangeBar.markerPct >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-700"
                style={{ left: `${rangeBar.markerPct}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              合理買入價 {fairValue != null ? `$${fairValue.toFixed(2)}` : ''}
            </span>
            <span className="flex items-center gap-1">
              重新估值 {reviewValue != null ? `$${reviewValue.toFixed(2)}` : ''}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400" />
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{row.label}</span>
            <span className={`text-sm font-semibold ${row.highlight ? `${priceColor} text-base` : 'text-gray-900'}`}>
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
