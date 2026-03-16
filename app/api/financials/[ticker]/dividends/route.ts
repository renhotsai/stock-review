import { NextResponse } from 'next/server';
import { getOrFetch } from '@/lib/financial-cache';
import { getDividendHistory } from '@/lib/yahoo-finance';
import type { DividendRecord } from '@/types/financials';

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    const data = await getOrFetch<DividendRecord[]>(
      ticker,
      'dividend_history',
      () => getDividendHistory(ticker),
      7 // 7 day TTL
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/financials/[ticker]/dividends error:', error);
    return NextResponse.json({ error: 'Failed to fetch dividend history' }, { status: 500 });
  }
}
