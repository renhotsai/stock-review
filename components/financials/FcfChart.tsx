'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { AnnualFinancial } from '@/types/financials';

function fmtB(n: number): string {
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

interface FcfChartProps {
  annuals: AnnualFinancial[];
}

export default function FcfChart({ annuals }: FcfChartProps) {
  const data = [...annuals]
    .sort((a, b) => a.year - b.year)
    .filter((a) => a.freeCashFlow != null)
    .map((a) => ({ year: String(a.year), FCF: a.freeCashFlow }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">自由現金流 (FCF)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fcfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="FCF"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#fcfGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
