import { getFinancialCache, setFinancialCache } from '@/lib/db';

export async function getOrFetch<T>(
  ticker: string,
  dataType: string,
  fetchFn: () => Promise<T>,
  ttlDays: number = 1
): Promise<T> {
  // Try cache first
  const cached = await getFinancialCache<T>(ticker, dataType);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  await setFinancialCache(ticker, dataType, data, ttlDays);

  return data;
}
