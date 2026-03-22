'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
          {p.name}: ${p.value?.toFixed(2) ?? '—'}
        </p>
      ))}
    </div>
  );
}

interface EpsChartProps {
  annuals: AnnualFinancial[];
}

export default function EpsChart({ annuals }: EpsChartProps) {
  const { t } = useTranslation();

  const data = [...annuals]
    .sort((a, b) => a.year - b.year)
    .map((a) => ({ year: String(a.year), EPS: a.eps }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">{t('financials.charts.eps')}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={45} tickFormatter={(v) => `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="EPS"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
