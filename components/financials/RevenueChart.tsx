'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { AnnualFinancial } from '@/types/financials';

function fmtB(n: number | null): string {
  if (n == null) return '—';
  const b = n / 1e9;
  return `$${b.toFixed(1)}B`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmtB(p.value)}
        </p>
      ))}
    </div>
  );
}

interface RevenueChartProps {
  annuals: AnnualFinancial[];
}

export default function RevenueChart({ annuals }: RevenueChartProps) {
  const data = [...annuals]
    .sort((a, b) => a.year - b.year)
    .map((a) => ({
      year: String(a.year),
      Revenue: a.revenue,
      'Net Income': a.netIncome,
    }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">年度營收 vs 淨利</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} tick={{ fontSize: 11 }} width={55} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Net Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
