'use client';

import type { KeyMetrics } from '@/types/financials';
import { useTranslation } from '@/contexts/LanguageContext';

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
}

interface KeyMetricsGridProps {
  metrics: KeyMetrics | null;
}

export default function KeyMetricsGrid({ metrics }: KeyMetricsGridProps) {
  const { t } = useTranslation();

  if (!metrics) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-gray-400 text-sm">Key metrics unavailable</p>
      </div>
    );
  }

  const groups: { title: string; items: MetricItem[] }[] = [
    {
      title: t('financials.keyMetrics.valuation'),
      items: [
        { label: t('financials.keyMetrics.pe'), value: fmt(metrics.peRatio, 'x', 1) },
        { label: t('financials.keyMetrics.pb'), value: fmt(metrics.pbRatio, 'x', 2) },
        { label: t('financials.keyMetrics.ps'), value: fmt(metrics.psRatio, 'x', 2) },
        { label: t('financials.keyMetrics.evEbitda'), value: fmt(metrics.evToEbitda, 'x', 1) },
      ],
    },
    {
      title: t('financials.keyMetrics.profitability'),
      items: [
        { label: t('financials.keyMetrics.roe'), value: pct(metrics.roe) },
        { label: t('financials.keyMetrics.roa'), value: pct(metrics.roa) },
        { label: t('financials.keyMetrics.grossMargin'), value: pct(metrics.grossMargin) },
        { label: t('financials.keyMetrics.operatingMargin'), value: pct(metrics.operatingMargin) },
        { label: t('financials.keyMetrics.netMargin'), value: pct(metrics.netMargin) },
      ],
    },
    {
      title: t('financials.keyMetrics.financialHealth'),
      items: [
        { label: t('financials.keyMetrics.debtToEquity'), value: fmt(metrics.debtToEquity, '', 2) },
        { label: t('financials.keyMetrics.currentRatio'), value: fmt(metrics.currentRatio, 'x', 2) },
        { label: t('financials.keyMetrics.eps'), value: fmt(metrics.eps, '', 2) },
        { label: t('financials.keyMetrics.bookValue'), value: fmt(metrics.bookValue, '', 2) },
      ],
    },
    {
      title: t('financials.keyMetrics.dividends'),
      items: [
        { label: t('financials.keyMetrics.dividendYield'), value: pct(metrics.dividendYield) },
        { label: t('financials.keyMetrics.payoutRatio'), value: pct(metrics.payoutRatio) },
      ],
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{t('financials.keyMetrics.title')}</h3>
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
