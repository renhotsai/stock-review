import { NextResponse } from 'next/server';
import { getPriceHistory, PeriodOption } from '@/lib/yahoo-finance';
import type { PricePoint } from '@/types/financials';

export const maxDuration = 30;

const VALID_PERIODS: PeriodOption[] = ['1M', '3M', '6M', '1Y', '5Y', 'MAX'];

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();
    const url = new URL(request.url);
    const periodParam = (url.searchParams.get('period') ?? '1Y').toUpperCase() as PeriodOption;
    const period = VALID_PERIODS.includes(periodParam) ? periodParam : '1Y';

    const data: PricePoint[] = await getPriceHistory(ticker, period);
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/financials/[ticker]/price-history error:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
