'use client';

import { useQuery } from '@tanstack/react-query';
import type { PriceResult } from '@/lib/yahoo-finance';

async function fetchPrice(ticker: string): Promise<PriceResult> {
  const res = await fetch(`/api/price/${ticker}`);
  if (!res.ok) throw new Error('Failed to fetch price');
  return res.json();
}

const TWENTY_MINUTES = 20 * 60 * 1000;

export function useStockPrice(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['price', ticker],
    queryFn: () => fetchPrice(ticker),
    enabled,
    staleTime: TWENTY_MINUTES,
    refetchInterval: TWENTY_MINUTES,
    refetchIntervalInBackground: false,
  });
}
