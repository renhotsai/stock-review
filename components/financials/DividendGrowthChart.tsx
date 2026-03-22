'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DividendRecord } from '@/types/financials';
import { calculateDividendGrowthRates } from '@/lib/dividend-utils';
import { useTranslation } from '@/contexts/LanguageContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; dataKey: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {
            p.dataKey === 'annualDividend'
              ? `$${p.value?.toFixed(4) ?? '—'}`
              : p.value != null ? `${(p.value * 100).toFixed(1)}%` : '—'
          }
        </p>
      ))}
    </div>
  );
}

interface DividendGrowthChartProps {
  records: DividendRecord[];
}

export default function DividendGrowthChart({ records }: DividendGrowthChartProps) {
  const { t } = useTranslation();

  const rates = calculateDividendGrowthRates(records);
  const data = rates.map((r) => ({
    year: String(r.year),
    annualDividend: r.annualTotal,
    yoyGrowth: r.growthRate,
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">{t('financials.charts.dividendGrowth')}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `$${v.toFixed(2)}`} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={45} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="annualDividend" name={t('financials.charts.annualDividend')} fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
          <Line yAxisId="right" type="monotone" dataKey="yoyGrowth" name={t('financials.charts.yoyGrowth')} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
