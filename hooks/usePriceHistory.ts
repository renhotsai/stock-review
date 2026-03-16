'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { PricePoint } from '@/types/financials';
import type { PeriodOption } from '@/lib/yahoo-finance';

async function fetchPriceHistory(ticker: string, period: PeriodOption): Promise<PricePoint[]> {
  const res = await fetch(`/api/financials/${ticker}/price-history?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch price history');
  return res.json();
}

export function usePriceHistory(ticker: string, defaultPeriod: PeriodOption = '1Y') {
  const [period, setPeriod] = useState<PeriodOption>(defaultPeriod);

  const query = useQuery({
    queryKey: ['price-history', ticker, period],
    queryFn: () => fetchPriceHistory(ticker, period),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return { ...query, period, setPeriod };
}
