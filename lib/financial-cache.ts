import { getFinancialCache, setFinancialCache } from '@/lib/db';

export async function getOrFetch<T>(
  ticker: string,
  dataType: string,
  fetchFn: () => Promise<T>,
  ttlDays: number = 1,
  isValid?: (data: T) => boolean
): Promise<T> {
  // Try cache first — skip if validator rejects the cached data
  const cached = await getFinancialCache<T>(ticker, dataType);
  if (cached !== null && (!isValid || isValid(cached))) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Only store in cache if data has actual content
  if (!isValid || isValid(data)) {
    await setFinancialCache(ticker, dataType, data, ttlDays);
  }

  return data;
}
