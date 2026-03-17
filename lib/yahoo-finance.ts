import type {
  CompanyProfile,
  KeyMetrics,
  AnnualFinancial,
  DividendRecord,
  PricePoint,
} from '@/types/financials';

export type PriceResult = {
  symbol: string;
  price: number | null;
  name: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getYf(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yf = require('yahoo-finance2').default;
  // Suppress data-usage notices that block requests on serverless environments
  try { yf.suppressNotices(['yahooSurvey', 'ripHistorical']); } catch { /* ignore */ }
  return yf;
}

export async function getStockPrice(symbol: string): Promise<PriceResult> {
  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yf.quote(symbol);
    return {
      symbol,
      price: quote?.regularMarketPrice ?? null,
      name: quote?.longName ?? quote?.shortName ?? null,
    };
  } catch (error) {
    console.error(`[yahoo-finance] getStockPrice(${symbol}) failed:`, error);
    return { symbol, price: null, name: null };
  }
}

export async function getStockPrices(symbols: string[]): Promise<PriceResult[]> {
  const results = await Promise.allSettled(symbols.map(getStockPrice));
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { symbol: symbols[i], price: null, name: null }
  );
}

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [quote, summaryDetail]: [any, any] = await Promise.all([
      yf.quote(ticker),
      yf.quoteSummary(ticker, { modules: ['assetProfile', 'summaryDetail', 'price'], validateResult: false }),
    ]);

    const profile = summaryDetail?.assetProfile ?? {};
    const price = summaryDetail?.price ?? {};

    return {
      ticker: ticker.toUpperCase(),
      name: price?.longName ?? quote?.longName ?? quote?.shortName ?? ticker,
      description: profile?.longBusinessSummary ?? '',
      sector: profile?.sector ?? '',
      industry: profile?.industry ?? '',
      employees: profile?.fullTimeEmployees ?? null,
      website: profile?.website ?? '',
      country: profile?.country ?? '',
      exchange: quote?.fullExchangeName ?? quote?.exchange ?? '',
      currency: quote?.currency ?? 'USD',
      marketCap: price?.marketCap ?? quote?.marketCap ?? null,
      logo: `https://logo.clearbit.com/${(profile?.website ?? '').replace(/https?:\/\//, '').split('/')[0]}`,
    };
  } catch (error) {
    console.error(`[yahoo-finance] getCompanyProfile(${ticker}) failed:`, error);
    return null;
  }
}

export async function getKeyMetrics(ticker: string): Promise<KeyMetrics | null> {
  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary: any = await yf.quoteSummary(ticker, {
      modules: [
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'price',
      ],
      validateResult: false,
    });

    const sd = summary?.summaryDetail ?? {};
    const ks = summary?.defaultKeyStatistics ?? {};
    const fd = summary?.financialData ?? {};
    const price = summary?.price ?? {};

    return {
      ticker: ticker.toUpperCase(),
      peRatio: sd?.trailingPE?.raw ?? sd?.trailingPE ?? null,
      pbRatio: ks?.priceToBook?.raw ?? ks?.priceToBook ?? null,
      psRatio: ks?.priceToSalesTrailing12Months?.raw ?? null,
      evToEbitda: ks?.enterpriseToEbitda?.raw ?? ks?.enterpriseToEbitda ?? null,
      debtToEquity: fd?.debtToEquity?.raw ?? fd?.debtToEquity ?? null,
      currentRatio: fd?.currentRatio?.raw ?? fd?.currentRatio ?? null,
      roe: fd?.returnOnEquity?.raw ?? fd?.returnOnEquity ?? null,
      roa: fd?.returnOnAssets?.raw ?? fd?.returnOnAssets ?? null,
      grossMargin: fd?.grossMargins?.raw ?? fd?.grossMargins ?? null,
      operatingMargin: fd?.operatingMargins?.raw ?? fd?.operatingMargins ?? null,
      netMargin: fd?.profitMargins?.raw ?? fd?.profitMargins ?? null,
      eps: ks?.trailingEps?.raw ?? ks?.trailingEps ?? null,
      bookValue: ks?.bookValue?.raw ?? ks?.bookValue ?? null,
      dividendYield: sd?.dividendYield?.raw ?? sd?.dividendYield ?? null,
      payoutRatio: sd?.payoutRatio?.raw ?? sd?.payoutRatio ?? null,
      beta: sd?.beta?.raw ?? sd?.beta ?? null,
      fiftyTwoWeekHigh: price?.fiftyTwoWeekHigh?.raw ?? sd?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: price?.fiftyTwoWeekLow?.raw ?? sd?.fiftyTwoWeekLow ?? null,
      averageVolume: sd?.averageVolume?.raw ?? sd?.averageVolume ?? null,
    };
  } catch (error) {
    console.error(`[yahoo-finance] getKeyMetrics(${ticker}) failed:`, error);
    return null;
  }
}

export async function getAnnualFinancials(ticker: string): Promise<AnnualFinancial[]> {
  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary: any = await yf.quoteSummary(ticker, {
      modules: ['incomeStatementHistory', 'cashflowStatementHistory'],
      validateResult: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incomeStatements: any[] = summary?.incomeStatementHistory?.incomeStatementHistory ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cashflows: any[] = summary?.cashflowStatementHistory?.cashflowStatements ?? [];

    const cashflowByYear = new Map<number, number | null>();
    for (const cf of cashflows) {
      const year = new Date(cf.endDate?.raw ? cf.endDate.raw * 1000 : cf.endDate).getFullYear();
      const fcf =
        (cf.totalCashFromOperatingActivities?.raw ?? cf.totalCashFromOperatingActivities ?? 0) -
        Math.abs(cf.capitalExpenditures?.raw ?? cf.capitalExpenditures ?? 0);
      cashflowByYear.set(year, fcf);
    }

    return incomeStatements.map((stmt) => {
      const endDate = stmt.endDate?.raw ? new Date(stmt.endDate.raw * 1000) : new Date(stmt.endDate);
      const year = endDate.getFullYear();
      const revenue = stmt.totalRevenue?.raw ?? stmt.totalRevenue ?? null;
      const netIncome = stmt.netIncome?.raw ?? stmt.netIncome ?? null;
      const grossProfit = stmt.grossProfit?.raw ?? stmt.grossProfit ?? null;
      const operatingIncome = stmt.operatingIncome?.raw ?? stmt.operatingIncome ?? null;

      return {
        year,
        revenue,
        netIncome,
        eps: stmt.dilutedEPS?.raw ?? stmt.dilutedEPS ?? null,
        freeCashFlow: cashflowByYear.get(year) ?? null,
        grossProfit,
        operatingIncome,
        grossMargin: revenue && grossProfit ? grossProfit / revenue : null,
        operatingMargin: revenue && operatingIncome ? operatingIncome / revenue : null,
        netMargin: revenue && netIncome ? netIncome / revenue : null,
      } as AnnualFinancial;
    });
  } catch (error) {
    console.error(`[yahoo-finance] getAnnualFinancials(${ticker}) failed:`, error);
    return [];
  }
}

export type PeriodOption = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

const periodMap: Record<PeriodOption, { period1: string; interval: string }> = {
  '1M': { period1: `${Math.floor((Date.now() - 30 * 86400000) / 1000)}`, interval: '1d' },
  '3M': { period1: `${Math.floor((Date.now() - 90 * 86400000) / 1000)}`, interval: '1d' },
  '6M': { period1: `${Math.floor((Date.now() - 180 * 86400000) / 1000)}`, interval: '1d' },
  '1Y': { period1: `${Math.floor((Date.now() - 365 * 86400000) / 1000)}`, interval: '1wk' },
  '5Y': { period1: `${Math.floor((Date.now() - 5 * 365 * 86400000) / 1000)}`, interval: '1mo' },
  MAX: { period1: '0', interval: '1mo' },
};

export async function getDividendHistory(ticker: string): Promise<DividendRecord[]> {
  try {
    const yf = getYf();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.historical(ticker, {
      period1: new Date(Date.now() - 10 * 365 * 86400000).toISOString().split('T')[0],
      period2: new Date().toISOString().split('T')[0],
      events: 'dividends',
    });

    if (!result || !Array.isArray(result)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((d: any) => {
      const date = d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date);
      return {
        date,
        amount: d.dividends ?? d.amount ?? 0,
        year: new Date(date).getFullYear(),
      };
    }).filter((d: DividendRecord) => d.amount > 0);
  } catch (error) {
    console.error(`[yahoo-finance] getDividendHistory(${ticker}) failed:`, error);
    return [];
  }
}

export async function getPriceHistory(
  ticker: string,
  period: PeriodOption = '1Y'
): Promise<PricePoint[]> {
  try {
    const yf = getYf();
    const { period1, interval } = periodMap[period];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yf.historical(ticker, {
      period1: period === 'MAX' ? '1900-01-01' : new Date(parseInt(period1) * 1000).toISOString().split('T')[0],
      period2: new Date().toISOString().split('T')[0],
      interval: interval as '1d' | '1wk' | '1mo',
    });

    if (!result || !Array.isArray(result)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((p: any) => ({
      date: p.date instanceof Date ? p.date.toISOString().split('T')[0] : String(p.date),
      close: p.close ?? 0,
      open: p.open ?? null,
      high: p.high ?? null,
      low: p.low ?? null,
      volume: p.volume ?? null,
    }));
  } catch (error) {
    console.error(`[yahoo-finance] getPriceHistory(${ticker}) failed:`, error);
    return [];
  }
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // US market: 9:30 AM – 4:00 PM EST = 13:30 – 20:00 UTC
  return totalMinutes >= 13 * 60 + 30 && totalMinutes <= 20 * 60;
}
