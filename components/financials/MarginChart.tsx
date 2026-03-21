'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { AnnualFinancial } from '@/types/financials';
import { useTranslation } from '@/contexts/LanguageContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

interface MarginChartProps {
  annuals: AnnualFinancial[];
}

export default function MarginChart({ annuals }: MarginChartProps) {
  const { t } = useTranslation();

  const data = [...annuals]
    .sort((a, b) => a.year - b.year)
    .map((a) => ({
      year: String(a.year),
      grossMargin: a.grossMargin,
      operatingMargin: a.operatingMargin,
      netMargin: a.netMargin,
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">{t('financials.charts.margins')}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} width={45} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="grossMargin" name={t('financials.charts.grossMargin')} stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="operatingMargin" name={t('financials.charts.operatingMargin')} stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="netMargin" name={t('financials.charts.netMargin')} stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
