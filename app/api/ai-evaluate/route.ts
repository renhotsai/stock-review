import { NextResponse } from 'next/server';
import type { FullFinancials } from '@/types/financials';

export const maxDuration = 30;

function getEmptyResult() {
  return {
    type: 'Growth',
    eps: 'EMPTY', fcf: 'EMPTY', roe: 'EMPTY',
    int_cov: 'EMPTY', moat: 'EMPTY', net_margin: 'EMPTY',
    has_dividends: 'EMPTY', policy: 'EMPTY', tech_risk: 'EMPTY', mgmt_risk: 'EMPTY',
    eps_value: null, growth_rate: null, expected_dividend: null, bvps: null,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const symbol: string | undefined = body.symbol;
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const baseUrl = process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:${process.env.PORT ?? 3000}`;

  const res = await fetch(`${baseUrl}/api/financials/${symbol.toUpperCase()}`);
  if (!res.ok) return NextResponse.json(getEmptyResult());

  const fin: FullFinancials = await res.json();
  const m = fin.metrics;
  const annuals = fin.annuals ?? [];

  // Derived values
  const hasDividends = (m?.dividendYield ?? 0) > 0;

  // Revenue growth: compare most recent vs previous year
  let revenueGrowth: number | null = null;
  if (annuals.length >= 2 && annuals[0].revenue && annuals[1].revenue) {
    revenueGrowth = (annuals[0].revenue - annuals[1].revenue) / Math.abs(annuals[1].revenue);
  }

  const isGrowth = !hasDividends && (revenueGrowth ?? 0) > 0.08;
  const type = isGrowth ? 'Growth' : hasDividends ? 'Dividends' : 'Growth';

  // EPS trend: check if eps is growing over last 3 annual reports
  const epsValues = annuals.slice(0, 4).map(a => a.eps).filter((e): e is number => e != null);
  let epsTrend: 'YES' | 'NO' | 'EMPTY' = 'EMPTY';
  if (epsValues.length >= 2) {
    // annuals are newest-first; growing means epsValues[0] > epsValues[last]
    const growing = epsValues[0] > epsValues[epsValues.length - 1];
    epsTrend = (m?.eps ?? 0) > 0 && growing ? 'YES' : 'NO';
  } else if ((m?.eps ?? 0) > 0) {
    epsTrend = 'YES';
  }

  // FCF from most recent annual
  const latestFcf = annuals[0]?.freeCashFlow ?? null;
  const fcf: 'YES' | 'NO' | 'EMPTY' = latestFcf != null ? (latestFcf > 0 ? 'YES' : 'NO') : 'EMPTY';

  // ROE
  const roe: 'YES' | 'NO' | 'EMPTY' = m?.roe != null
    ? (m.roe > 0.15 ? 'YES' : 'NO')
    : 'EMPTY';

  // Interest coverage proxy via debt/equity
  const dte = m?.debtToEquity ?? null;
  const int_cov: 'NO_DEBT' | 'ABOVE_10' | 'ABOVE_4' | 'NO' | 'EMPTY' =
    dte == null ? 'EMPTY'
    : dte < 30 ? 'NO_DEBT'   // debtToEquity is in % in yahoo-finance2 (e.g. 30 = 0.3)
    : dte < 100 ? 'ABOVE_10'
    : dte < 200 ? 'ABOVE_4'
    : 'NO';

  // Moat via gross margin
  const gm = m?.grossMargin ?? null;
  const moat: 'TWO_MOATS' | 'ONE_MOAT' | 'NO' | 'EMPTY' =
    gm == null ? 'EMPTY'
    : gm > 0.5 ? 'TWO_MOATS'
    : gm > 0.3 ? 'ONE_MOAT'
    : 'NO';

  // Net margin
  const nm = m?.netMargin ?? null;
  const net_margin: 'ABOVE_20' | 'ABOVE_10' | 'NO' | 'EMPTY' =
    nm == null ? 'EMPTY'
    : nm > 0.20 ? 'ABOVE_20'
    : nm > 0.10 ? 'ABOVE_10'
    : 'NO';

  // Dividends / policy
  const has_dividends = hasDividends ? 'YES' : 'NO';
  const policy = (m?.payoutRatio ?? 0) > 0 ? 'YES' : hasDividends ? 'YES' : 'NO';

  // Tech risk heuristic
  const LOW_RISK_SYMBOLS = ['XOM','CVX','KO','PG','JNJ','MCD','WMT','BRK-B','T','VZ'];
  const tech_risk = LOW_RISK_SYMBOLS.includes(symbol.toUpperCase()) ? 'LOW' : 'MEDIUM';

  // Valuation fields
  const eps_value = m?.eps ?? null;
  const growth_rate = revenueGrowth != null ? Math.round(revenueGrowth * 100) : null;
  // expected_dividend: annual dividend per share from Yahoo Finance summaryDetail
  const expected_dividend: number | null = m?.dividendRate ?? null;
  const bvps = m?.bookValue ?? null;

  return NextResponse.json({
    type,
    eps: epsTrend, fcf, roe, int_cov, moat, net_margin,
    has_dividends, policy, tech_risk, mgmt_risk: 'LOW',
    eps_value, growth_rate, expected_dividend, bvps,
  });
}
