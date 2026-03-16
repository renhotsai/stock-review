'use client';

import { useQuery } from '@tanstack/react-query';
import type { FullFinancials } from '@/types/financials';

async function fetchFinancials(ticker: string): Promise<FullFinancials> {
  const res = await fetch(`/api/financials/${ticker}`);
  if (!res.ok) throw new Error('Failed to fetch financials');
  return res.json();
}

export function useFinancials(ticker: string, enabled = true) {
  return useQuery({
    queryKey: ['financials', ticker],
    queryFn: () => fetchFinancials(ticker),
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
