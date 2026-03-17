/**
 * Yahoo Finance data fetcher — pure fetch, no external library.
 * Uses Yahoo Finance v8 / v10 REST endpoints directly.
 * Works on any Node version, no yahoo-finance2 dependency.
 */

import type {
  CompanyProfile,
  KeyMetrics,
  AnnualFinancial,
  DividendRecord,
  PricePoint,
} from '@/types/financials';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

export type PriceResult = {
  symbol: string;
  price: number | null;
  name: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function yfChart(ticker: string, params = 'interval=1d&range=1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?${params}`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) throw new Error(`chart HTTP ${res.status}`);
  const json = await res.json();
  if (json.chart?.error) throw new Error(json.chart.error.description);
  return json?.chart?.result?.[0] ?? null;
}

async function yfSummary(ticker: string, modules: string[]) {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules.join(',')}`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) throw new Error(`quoteSummary HTTP ${res.status}`);
  const json = await res.json();
  if (json.quoteSummary?.error) throw new Error(json.quoteSummary.error.description);
  return json?.quoteSummary?.result?.[0] ?? null;
}

function raw(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'object' && 'raw' in (val as object)) return (val as { raw: number }).raw ?? null;
  return typeof val === 'number' ? val : null;
}

// ── Price ─────────────────────────────────────────────────────────────────────

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
  const results = await Promise.allSettled(symbols.map(s => getStockPrice(s)));
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { symbol: symbols[i], price: null, name: null }
  );
}

// ── Company Profile ───────────────────────────────────────────────────────────

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  try {
    const t = ticker.toUpperCase();
    const [chartResult, summary] = await Promise.all([
      yfChart(t),
      yfSummary(t, ['assetProfile', 'price']),
    ]);

    const meta    = chartResult?.meta ?? {};
    const profile = summary?.assetProfile ?? {};
    const price   = summary?.price ?? {};

    return {
      ticker: t,
      name: raw(price?.longName) as unknown as string
        ?? meta?.longName ?? meta?.shortName ?? t,
      description: profile?.longBusinessSummary ?? '',
      sector:      profile?.sector    ?? '',
      industry:    profile?.industry  ?? '',
      employees:   profile?.fullTimeEmployees ?? null,
      website:     profile?.website   ?? '',
      country:     profile?.country   ?? '',
      exchange:    meta?.exchangeName ?? '',
      currency:    meta?.currency     ?? 'USD',
      marketCap:   raw(price?.marketCap),
      logo: `https://logo.clearbit.com/${(profile?.website ?? '').replace(/https?:\/\//, '').split('/')[0]}`,
    };
  } catch (error) {
    console.error(`[yahoo-finance] getCompanyProfile(${ticker}) failed:`, error);
    return null;
  }
}

// ── Key Metrics ───────────────────────────────────────────────────────────────

export async function getKeyMetrics(ticker: string): Promise<KeyMetrics | null> {
  try {
    const t = ticker.toUpperCase();
    const summary = await yfSummary(t, [
      'summaryDetail', 'defaultKeyStatistics', 'financialData', 'price',
    ]);

    const sd = summary?.summaryDetail        ?? {};
    const ks = summary?.defaultKeyStatistics ?? {};
    const fd = summary?.financialData        ?? {};
    const pr = summary?.price                ?? {};

    return {
      ticker: t,
      peRatio:            raw(sd?.trailingPE)       ?? raw(pr?.trailingPE),
      pbRatio:            raw(ks?.priceToBook),
      psRatio:            raw(ks?.priceToSalesTrailing12Months),
      evToEbitda:         raw(ks?.enterpriseToEbitda),
      debtToEquity:       raw(fd?.debtToEquity),
      currentRatio:       raw(fd?.currentRatio),
      roe:                raw(fd?.returnOnEquity),
      roa:                raw(fd?.returnOnAssets),
      grossMargin:        raw(fd?.grossMargins),
      operatingMargin:    raw(fd?.operatingMargins),
      netMargin:          raw(fd?.profitMargins),
      eps:                raw(ks?.trailingEps),
      bookValue:          raw(ks?.bookValue),
      dividendYield:      raw(sd?.dividendYield),
      dividendRate:       raw(sd?.dividendRate),
      payoutRatio:        raw(sd?.payoutRatio),
      beta:               raw(sd?.beta),
      fiftyTwoWeekHigh:   raw(sd?.fiftyTwoWeekHigh),
      fiftyTwoWeekLow:    raw(sd?.fiftyTwoWeekLow),
      averageVolume:      raw(sd?.averageVolume),
      revenueGrowth:      raw(fd?.revenueGrowth),
      freeCashflow:       raw(fd?.freeCashflow),
    };
  } catch (error) {
    console.error(`[yahoo-finance] getKeyMetrics(${ticker}) failed:`, error);
    return null;
  }
}

// ── Annual Financials ─────────────────────────────────────────────────────────

export async function getAnnualFinancials(ticker: string): Promise<AnnualFinancial[]> {
  try {
    const t = ticker.toUpperCase();
    const summary = await yfSummary(t, [
      'incomeStatementHistory', 'cashflowStatementHistory',
    ]);

    const incomeStatements: unknown[] =
      summary?.incomeStatementHistory?.incomeStatementHistory ?? [];
    const cashflows: unknown[] =
      summary?.cashflowStatementHistory?.cashflowStatements ?? [];

    const cashflowByYear = new Map<number, number | null>();
    for (const cf of cashflows as Record<string, unknown>[]) {
      const endRaw = (cf.endDate as { raw?: number } | undefined)?.raw;
      const year   = new Date(endRaw ? endRaw * 1000 : String(cf.endDate)).getFullYear();
      const ops    = raw(cf.totalCashFromOperatingActivities) ?? 0;
      const capex  = Math.abs(raw(cf.capitalExpenditures) ?? 0);
      cashflowByYear.set(year, ops - capex);
    }

    return (incomeStatements as Record<string, unknown>[]).map(stmt => {
      const endRaw   = (stmt.endDate as { raw?: number } | undefined)?.raw;
      const year     = new Date(endRaw ? endRaw * 1000 : String(stmt.endDate)).getFullYear();
      const revenue  = raw(stmt.totalRevenue);
      const netIncome = raw(stmt.netIncome);
      const grossProfit = raw(stmt.grossProfit);
      const operatingIncome = raw(stmt.operatingIncome);

      return {
        year,
        revenue,
        netIncome,
        eps:             raw(stmt.dilutedEPS),
        freeCashFlow:    cashflowByYear.get(year) ?? null,
        grossProfit,
        operatingIncome,
        grossMargin:     revenue && grossProfit     ? grossProfit / revenue     : null,
        operatingMargin: revenue && operatingIncome ? operatingIncome / revenue : null,
        netMargin:       revenue && netIncome       ? netIncome / revenue       : null,
      } as AnnualFinancial;
    });
  } catch (error) {
    console.error(`[yahoo-finance] getAnnualFinancials(${ticker}) failed:`, error);
    return [];
  }
}

// ── Dividend History ──────────────────────────────────────────────────────────

export async function getDividendHistory(ticker: string): Promise<DividendRecord[]> {
  try {
    const t = ticker.toUpperCase();
    const tenYearsAgo = Math.floor((Date.now() - 10 * 365 * 86400000) / 1000);
    const result = await yfChart(
      t,
      `interval=1mo&period1=${tenYearsAgo}&period2=${Math.floor(Date.now() / 1000)}&events=div`
    );

    const dividends: Record<string, { amount: number }> =
      result?.events?.dividends ?? {};

    return Object.entries(dividends)
      .map(([ts, d]) => {
        const date = new Date(parseInt(ts) * 1000).toISOString().split('T')[0];
        return { date, amount: d.amount ?? 0, year: new Date(date).getFullYear() };
      })
      .filter(d => d.amount > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`[yahoo-finance] getDividendHistory(${ticker}) failed:`, error);
    return [];
  }
}

// ── Price History ─────────────────────────────────────────────────────────────

export type PeriodOption = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

const periodParams: Record<PeriodOption, string> = {
  '1M':  `interval=1d&range=1mo`,
  '3M':  `interval=1d&range=3mo`,
  '6M':  `interval=1d&range=6mo`,
  '1Y':  `interval=1wk&range=1y`,
  '5Y':  `interval=1mo&range=5y`,
  'MAX': `interval=1mo&range=max`,
};

export async function getPriceHistory(
  ticker: string,
  period: PeriodOption = '1Y'
): Promise<PricePoint[]> {
  try {
    const result = await yfChart(ticker.toUpperCase(), periodParams[period]);
    const timestamps: number[]  = result?.timestamp ?? [];
    const closes: number[]      = result?.indicators?.quote?.[0]?.close ?? [];
    const opens: number[]       = result?.indicators?.quote?.[0]?.open  ?? [];
    const highs: number[]       = result?.indicators?.quote?.[0]?.high  ?? [];
    const lows: number[]        = result?.indicators?.quote?.[0]?.low   ?? [];
    const volumes: number[]     = result?.indicators?.quote?.[0]?.volume ?? [];

    return timestamps
      .map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString().split('T')[0],
        close:  closes[i]  ?? 0,
        open:   opens[i]   ?? null,
        high:   highs[i]   ?? null,
        low:    lows[i]    ?? null,
        volume: volumes[i] ?? null,
      }))
      .filter(p => p.close > 0);
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
