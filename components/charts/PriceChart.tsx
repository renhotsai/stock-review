'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import type { PeriodOption } from '@/lib/yahoo-finance';
import { useTranslation } from '@/contexts/LanguageContext';

const PERIODS: PeriodOption[] = ['1M', '3M', '6M', '1Y', '5Y', 'MAX'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="font-semibold text-gray-900">${payload[0]?.value?.toFixed(2)}</p>
    </div>
  );
}

interface PriceChartProps {
  ticker: string;
  fairValue?: number | null;
  reviewValue?: number | null;
}

export default function PriceChart({ ticker, fairValue, reviewValue }: PriceChartProps) {
  const { t } = useTranslation();
  const { data, isLoading, period, setPeriod } = usePriceHistory(ticker, '1Y');

  const chartData = (data ?? []).map((p) => ({
    date: p.date,
    Price: p.close,
  }));

  const prices = chartData.map((d) => d.Price).filter(Boolean);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const margin = (maxP - minP) * 0.1;
  const domainMin = Math.max(0, minP - margin);
  const domainMax = maxP + margin;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">{t('financials.charts.priceChart')}</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-3 text-xs">
        {fairValue && (
          <span className="flex items-center gap-1.5 text-green-700">
            <span className="w-6 border-t-2 border-dashed border-green-500" />
            {t('financials.charts.fairValue')} ${fairValue.toFixed(2)}
          </span>
        )}
        {reviewValue && (
          <span className="flex items-center gap-1.5 text-yellow-700">
            <span className="w-6 border-t-2 border-dashed border-yellow-500" />
            {t('financials.charts.reviewValue')} ${reviewValue.toFixed(2)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 bg-gray-100 animate-pulse rounded" />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d) => {
                const date = new Date(d);
                return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[domainMin, domainMax]}
              tick={{ fontSize: 11 }}
              width={55}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {fairValue && (
              <ReferenceLine
                y={fairValue}
                stroke="#22c55e"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}
            {reviewValue && (
              <ReferenceLine
                y={reviewValue}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            )}
            <Area
              type="monotone"
              dataKey="Price"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
