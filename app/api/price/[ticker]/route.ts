import { NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/yahoo-finance';

export async function GET(
  _request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();
    const result = await getStockPrice(ticker);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/price/[ticker] error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
