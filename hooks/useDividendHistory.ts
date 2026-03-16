'use client';

import { useQuery } from '@tanstack/react-query';
import type { DividendRecord } from '@/types/financials';

async function fetchDividends(ticker: string): Promise<DividendRecord[]> {
  const res = await fetch(`/api/financials/${ticker}/dividends`);
  if (!res.ok) throw new Error('Failed to fetch dividend history');
  return res.json();
}

export function useDividendHistory(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['dividends', ticker],
    queryFn: () => fetchDividends(ticker),
    enabled,
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}
