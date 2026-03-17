import { NextResponse } from 'next/server';
import { getOrFetch } from '@/lib/financial-cache';
import { getCompanyProfile, getKeyMetrics, getAnnualFinancials } from '@/lib/yahoo-finance';
import type { FullFinancials } from '@/types/financials';

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();

    const data = await getOrFetch<FullFinancials>(
      ticker,
      'full_financials',
      async () => {
        const [profile, metrics, annuals] = await Promise.all([
          getCompanyProfile(ticker),
          getKeyMetrics(ticker),
          getAnnualFinancials(ticker),
        ]);
        return {
          profile,
          metrics,
          annuals,
          fetchedAt: new Date().toISOString(),
        };
      },
      1 // 1 day TTL
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/financials/[ticker] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
