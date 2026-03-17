import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getYf(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { YahooFinance } = require('yahoo-finance2');
  return new YahooFinance();
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.search(q, { quotesCount: 8, newsCount: 0 });
    const quotes = (result?.quotes ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => item.quoteType === 'EQUITY')
      .slice(0, 7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.shortname ?? item.longname ?? item.symbol,
        exchange: item.exchDisp ?? '',
      }));
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([]);
  }
}
