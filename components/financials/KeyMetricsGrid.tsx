'use client';

import type { KeyMetrics } from '@/types/financials';

function pct(n: number | null) {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function fmt(n: number | null, suffix = '', decimals = 2) {
  if (n == null) return '—';
  return `${n.toFixed(decimals)}${suffix}`;
}

interface MetricItem {
  label: string;
  value: string;
  hint?: string;
}

interface KeyMetricsGridProps {
  metrics: KeyMetrics | null;
}

export default function KeyMetricsGrid({ metrics }: KeyMetricsGridProps) {
  if (!metrics) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-gray-400 text-sm">Key metrics unavailable</p>
      </div>
    );
  }

  const groups: { title: string; items: MetricItem[] }[] = [
    {
      title: '估值指標',
      items: [
        { label: 'P/E (本益比)', value: fmt(metrics.peRatio, 'x', 1) },
        { label: 'P/B (市帳率)', value: fmt(metrics.pbRatio, 'x', 2) },
        { label: 'P/S (市銷率)', value: fmt(metrics.psRatio, 'x', 2) },
        { label: 'EV/EBITDA', value: fmt(metrics.evToEbitda, 'x', 1) },
      ],
    },
    {
      title: '獲利能力',
      items: [
        { label: 'ROE', value: pct(metrics.roe) },
        { label: 'ROA', value: pct(metrics.roa) },
        { label: '毛利率', value: pct(metrics.grossMargin) },
        { label: '營業利潤率', value: pct(metrics.operatingMargin) },
        { label: '淨利潤率', value: pct(metrics.netMargin) },
      ],
    },
    {
      title: '財務健康',
      items: [
        { label: '負債權益比', value: fmt(metrics.debtToEquity, '', 2) },
        { label: '流動比率', value: fmt(metrics.currentRatio, 'x', 2) },
        { label: 'EPS', value: fmt(metrics.eps, '', 2) },
        { label: '每股帳面價值', value: fmt(metrics.bookValue, '', 2) },
      ],
    },
    {
      title: '股息',
      items: [
        { label: '股息殖利率', value: pct(metrics.dividendYield) },
        { label: '配息率', value: pct(metrics.payoutRatio) },
      ],
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">關鍵指標</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.title}</p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
