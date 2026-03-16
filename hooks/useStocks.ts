'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Stock } from '@/lib/db';

async function fetchStocks(): Promise<Stock[]> {
  const res = await fetch('/api/stocks');
  if (!res.ok) throw new Error('Failed to fetch stocks');
  return res.json();
}

export function useStocks() {
  return useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/stocks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete stock');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}
