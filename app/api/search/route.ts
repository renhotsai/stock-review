import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _yf: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getYf(): Promise<any> {
  if (_yf) return _yf;
  const mod = await import('yahoo-finance2');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor: any = (mod as any).YahooFinance ?? (mod as any).default;
  _yf = typeof Ctor === 'function' ? new Ctor() : Ctor;
  return _yf;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const yf = await getYf();
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
