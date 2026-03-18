import { NextResponse } from 'next/server';
import { analyzeStock } from '@/lib/ai-analyst';
import type { StockType } from '@/types/stock';

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await request.json();
  const ticker: string = (body.ticker ?? '').trim().toUpperCase();
  const type: StockType = body.type;

  if (!ticker) {
    return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
  }
  if (!['Growth', 'Dividends', 'Asset'].includes(type)) {
    return NextResponse.json({ error: 'type must be Growth, Dividends, or Asset' }, { status: 400 });
  }

  try {
    const payload = await analyzeStock(ticker, type);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('[analyze] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
