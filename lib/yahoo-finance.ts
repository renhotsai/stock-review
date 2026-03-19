/**
 * Financial data fetcher — hybrid approach:
 *
 *  ▸ Fundamental data (profile, key metrics, annual financials):
 *    Financial Modeling Prep (FMP)  https://financialmodelingprep.com
 *    Requires FMP_API_KEY in .env.local  (free tier: 250 req/day)
 *
 *  ▸ Price, price history, dividend history:
 *    Yahoo Finance v8 chart — no auth required, always works server-side
 */

import type {
  CompanyProfile,
  KeyMetrics,
  AnnualFinancial,
  DividendRecord,
  PricePoint,
} from '@/types/financials';

// ── FMP configuration ─────────────────────────────────────────────────────────

const FMP_BASE = 'https://financialmodelingprep.com';

function fmpKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key || key === 'your_fmp_api_key_here') {
    throw new Error(
      'FMP_API_KEY is not set. Add it to .env.local and Vercel → Settings → Environment Variables.',
    );
  }
  return key;
}

// ── FMP response type definitions ─────────────────────────────────────────────

interface FmpProfile {
  symbol: string;
  companyName: string;
  description: string;
  sector: string;
  industry: string;
  fullTimeEmployees: string | number | null;
  website: string;
  country: string;
  exchange: string;
  exchangeShortName: string;
  currency: string;
  mktCap: number | null;
  image: string;       // "https://financialmodelingprep.com/image-stock/KO.png"
  beta: number | null;
  volAvg: number | null;
  range: string;       // "54.15-70.16" (52-week low-high)
}

interface FmpKeyMetricsTTM {
  peRatioTTM: number | null;
  pbRatioTTM: number | null;
  priceToSalesRatioTTM: number | null;
  enterpriseValueOverEBITDATTM: number | null;
  debtToEquityTTM: number | null;
  currentRatioTTM: number | null;
  roeTTM: number | null;
  dividendYieldTTM: number | null;       // decimal e.g. 0.031 = 3.1%
  dividendPerShareTTM: number | null;    // annual $ per share e.g. 1.94
  payoutRatioTTM: number | null;
  bookValuePerShareTTM: number | null;
  netIncomePerShareTTM: number | null;   // diluted EPS TTM
  freeCashFlowPerShareTTM: number | null;
}

interface FmpRatiosTTM {
  grossProfitMarginTTM: number | null;
  operatingProfitMarginTTM: number | null;
  netProfitMarginTTM: number | null;
  returnOnAssetsTTM: number | null;
  returnOnEquityTTM: number | null;
}

interface FmpIncomeStatement {
  date: string;
  calendarYear: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  epsDiluted: number | null;
  grossProfitRatio: number | null;
  operatingIncomeRatio: number | null;
  netIncomeRatio: number | null;
}

interface FmpCashFlowStatement {
  date: string;
  calendarYear: string;
  freeCashFlow: number | null;      // FMP pre-computes: operatingCF - capex
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
}

// ── FMP fetch helpers ─────────────────────────────────────────────────────────

/** Fetch a single-object FMP endpoint (returns first element of array) */
async function fmpFetch<T>(endpoint: string): Promise<T | null> {
  const url = `${FMP_BASE}${endpoint}&apikey=${fmpKey()}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[fmp] ${endpoint} → HTTP ${res.status}`, body.slice(0, 200));
      return null;
    }
    const json = await res.json();
    // FMP errors arrive as { "Error Message": "..." }
    if (json && typeof json === 'object' && ('Error Message' in json || 'message' in json)) {
      console.error(`[fmp] ${endpoint} returned error:`, json);
      return null;
    }
    if (Array.isArray(json)) return (json[0] as T) ?? null;
    return json as T;
  } catch (e) {
    console.error(`[fmp] ${endpoint} failed:`, e);
    return null;
  }
}

/** Fetch a list FMP endpoint (returns the full array) */
async function fmpFetchList<T>(endpoint: string): Promise<T[]> {
  const url = `${FMP_BASE}${endpoint}&apikey=${fmpKey()}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`[fmp] ${endpoint} → HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json as T[];
  } catch (e) {
    console.error(`[fmp] ${endpoint} failed:`, e);
    return [];
  }
}

/** Safely convert any value to a finite number, or null */
function n(val: unknown): number | null {
  if (val == null) return null;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isFinite(num) ? num : null;
}

// ── Yahoo Finance v8 (price / history / dividends — no auth) ─────────────────

const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function yfChart(ticker: string, params = 'interval=1d&range=1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?${params}`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) throw new Error(`chart HTTP ${res.status}`);
  const json = await res.json();
  if (json.chart?.error) throw new Error(json.chart.error.description);
  return json?.chart?.result?.[0] ?? null;
}

// ── Public types ──────────────────────────────────────────────────────────────

export type PriceResult = {
  symbol: string;
  price: number | null;
  name: string | null;
};

// ── Price (Yahoo Finance v8) ──────────────────────────────────────────────────

export async function getStockPrice(symbol: string): Promise<PriceResult> {
  try {
    const result = await yfChart(symbol.toUpperCase());
    const meta = result?.meta;
    return {
      symbol: symbol.toUpperCase(),
      price: meta?.regularMarketPrice ?? null,
      name: meta?.longName ?? meta?.shortName ?? null,
    };
  } catch (error) {
    console.error(`[yahoo-finance] getStockPrice(${symbol}) failed:`, error);
    return { symbol: symbol.toUpperCase(), price: null, name: null };
  }
}

export async function getStockPrices(symbols: string[]): Promise<PriceResult[]> {
  const results = await Promise.allSettled(symbols.map((s) => getStockPrice(s)));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { symbol: symbols[i], price: null, name: null },
  );
}

// ── Company Profile (FMP /v3/profile) ────────────────────────────────────────

export async function getCompanyProfile(
  ticker: string,
): Promise<CompanyProfile | null> {
  try {
    const t = ticker.toUpperCase();
    const p = await fmpFetch<FmpProfile>(`/stable/profile?symbol=${t}&`);
    if (!p) return null;

    const employees =
      p.fullTimeEmployees != null
        ? parseInt(String(p.fullTimeEmployees).replace(/,/g, ''), 10) || null
        : null;

    return {
      ticker: t,
      name: p.companyName || t,
      description: p.description || '',
      sector: p.sector || '',
      industry: p.industry || '',
      employees,
      website: p.website || '',
      country: p.country || '',
      exchange: p.exchangeShortName || p.exchange || '',
      currency: p.currency || 'USD',
      marketCap: n(p.mktCap),
      logo: p.image || '',
    };
  } catch (error) {
    console.error(`[fmp] getCompanyProfile(${ticker}) failed:`, error);
    return null;
  }
}

// ── Key Metrics (FMP /v3/key-metrics-ttm + /v3/ratios-ttm + /v3/profile) ─────

export async function getKeyMetrics(ticker: string): Promise<KeyMetrics | null> {
  try {
    const t = ticker.toUpperCase();

    // Parallel fetch: profile (beta, 52wk range, avgVolume),
    //                 key-metrics-ttm (PE, PB, PS, EV/EBITDA, D/E, dividends…)
    //                 ratios-ttm (margins, ROA, ROE)
    const [profile, km, ratios] = await Promise.all([
      fmpFetch<FmpProfile>(`/stable/profile?symbol=${t}&`),
      fmpFetch<FmpKeyMetricsTTM>(`/stable/key-metrics-ttm?symbol=${t}&`),
      fmpFetch<FmpRatiosTTM>(`/stable/ratios-ttm?symbol=${t}&`),
    ]);

    if (!km && !ratios && !profile) return null;

    // Parse 52-week range string "lowPrice-highPrice"
    let fiftyTwoWeekHigh: number | null = null;
    let fiftyTwoWeekLow: number | null = null;
    if (profile?.range) {
      const m = profile.range.match(/^([\d.]+)-([\d.]+)$/);
      if (m) {
        fiftyTwoWeekLow  = parseFloat(m[1]) || null;
        fiftyTwoWeekHigh = parseFloat(m[2]) || null;
      }
    }

    return {
      ticker: t,
      peRatio:          n(km?.peRatioTTM),
      pbRatio:          n(km?.pbRatioTTM),
      psRatio:          n(km?.priceToSalesRatioTTM),
      evToEbitda:       n(km?.enterpriseValueOverEBITDATTM),
      debtToEquity:     n(km?.debtToEquityTTM),
      currentRatio:     n(km?.currentRatioTTM),
      // Prefer ratios-ttm (standard ROE); fall back to key-metrics-ttm
      roe:              n(ratios?.returnOnEquityTTM ?? km?.roeTTM),
      roa:              n(ratios?.returnOnAssetsTTM),
      grossMargin:      n(ratios?.grossProfitMarginTTM),
      operatingMargin:  n(ratios?.operatingProfitMarginTTM),
      netMargin:        n(ratios?.netProfitMarginTTM),
      eps:              n(km?.netIncomePerShareTTM),
      bookValue:        n(km?.bookValuePerShareTTM),
      dividendYield:    n(km?.dividendYieldTTM),     // decimal e.g. 0.031
      dividendRate:     n(km?.dividendPerShareTTM),   // $ per share e.g. 1.94
      payoutRatio:      n(km?.payoutRatioTTM),
      beta:             n(profile?.beta),
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      averageVolume:    n(profile?.volAvg),
      revenueGrowth:    null,  // TTM growth not available without extra API call
      freeCashflow:     null,  // TTM total FCF not in TTM endpoints; see AnnualFinancials
    };
  } catch (error) {
    console.error(`[fmp] getKeyMetrics(${ticker}) failed:`, error);
    return null;
  }
}

// ── Annual Financials (FMP /v3/income-statement + /v3/cash-flow-statement) ────

export async function getAnnualFinancials(
  ticker: string,
): Promise<AnnualFinancial[]> {
  try {
    const t = ticker.toUpperCase();

    const [incomeStmts, cashFlows] = await Promise.all([
      fmpFetchList<FmpIncomeStatement>(
        `/stable/income-statement?symbol=${t}&period=annual&limit=4&`,
      ),
      fmpFetchList<FmpCashFlowStatement>(
        `/stable/cash-flow-statement?symbol=${t}&period=annual&limit=4&`,
      ),
    ]);

    // Build year → freeCashFlow map from cash flow statements
    const fcfByYear = new Map<number, number | null>();
    for (const cf of cashFlows) {
      const year = parseInt(cf.calendarYear, 10);
      if (year) fcfByYear.set(year, n(cf.freeCashFlow));
    }

    return incomeStmts.map((stmt) => {
      const year = parseInt(stmt.calendarYear, 10);
      const revenue = n(stmt.revenue);
      const grossProfit = n(stmt.grossProfit);
      const opIncome = n(stmt.operatingIncome);
      const netIncome = n(stmt.netIncome);

      return {
        year,
        revenue,
        netIncome,
        eps: n(stmt.epsDiluted),
        freeCashFlow: fcfByYear.get(year) ?? null,
        grossProfit,
        operatingIncome: opIncome,
        // Use FMP's pre-computed ratios; fall back to manual calc
        grossMargin:
          n(stmt.grossProfitRatio) ??
          (revenue && grossProfit ? grossProfit / revenue : null),
        operatingMargin:
          n(stmt.operatingIncomeRatio) ??
          (revenue && opIncome ? opIncome / revenue : null),
        netMargin:
          n(stmt.netIncomeRatio) ??
          (revenue && netIncome ? netIncome / revenue : null),
      } as AnnualFinancial;
    });
  } catch (error) {
    console.error(`[fmp] getAnnualFinancials(${ticker}) failed:`, error);
    return [];
  }
}

// ── Dividend History (Yahoo Finance v8) ───────────────────────────────────────

export async function getDividendHistory(
  ticker: string,
): Promise<DividendRecord[]> {
  try {
    const t = ticker.toUpperCase();
    const tenYearsAgo = Math.floor((Date.now() - 10 * 365 * 86400000) / 1000);
    const result = await yfChart(
      t,
      `interval=1mo&period1=${tenYearsAgo}&period2=${Math.floor(Date.now() / 1000)}&events=div`,
    );

    const dividends: Record<string, { amount: number }> =
      result?.events?.dividends ?? {};

    return Object.entries(dividends)
      .map(([ts, d]) => {
        const date = new Date(parseInt(ts) * 1000).toISOString().split('T')[0];
        return { date, amount: d.amount ?? 0, year: new Date(date).getFullYear() };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`[yahoo-finance] getDividendHistory(${ticker}) failed:`, error);
    return [];
  }
}

// ── Price History (Yahoo Finance v8) ──────────────────────────────────────────

export type PeriodOption = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

const periodParams: Record<PeriodOption, string> = {
  '1M':  'interval=1d&range=1mo',
  '3M':  'interval=1d&range=3mo',
  '6M':  'interval=1d&range=6mo',
  '1Y':  'interval=1wk&range=1y',
  '5Y':  'interval=1mo&range=5y',
  MAX:   'interval=1mo&range=max',
};

export async function getPriceHistory(
  ticker: string,
  period: PeriodOption = '1Y',
): Promise<PricePoint[]> {
  try {
    const result = await yfChart(ticker.toUpperCase(), periodParams[period]);
    const timestamps: number[] = result?.timestamp ?? [];
    const closes: number[]  = result?.indicators?.quote?.[0]?.close  ?? [];
    const opens: number[]   = result?.indicators?.quote?.[0]?.open   ?? [];
    const highs: number[]   = result?.indicators?.quote?.[0]?.high   ?? [];
    const lows: number[]    = result?.indicators?.quote?.[0]?.low    ?? [];
    const volumes: number[] = result?.indicators?.quote?.[0]?.volume ?? [];

    return timestamps
      .map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString().split('T')[0],
        close:  closes[i]  ?? 0,
        open:   opens[i]   ?? null,
        high:   highs[i]   ?? null,
        low:    lows[i]    ?? null,
        volume: volumes[i] ?? null,
      }))
      .filter((p) => p.close > 0);
  } catch (error) {
    console.error(`[yahoo-finance] getPriceHistory(${ticker}) failed:`, error);
    return [];
  }
}

// ── Market Hours ──────────────────────────────────────────────────────────────

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  // US market 9:30–16:00 ET = 13:30–20:00 UTC
  return totalMinutes >= 13 * 60 + 30 && totalMinutes <= 20 * 60;
}
