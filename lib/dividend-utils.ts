import type { DividendRecord } from '@/types/financials';

export interface AnnualDividend {
  year: number;
  total: number;
  count: number;
}

export interface DividendGrowthRate {
  year: number;
  growthRate: number | null;
  annualTotal: number;
}

export type DividendFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'irregular';

/**
 * Count the number of consecutive years where dividends were paid,
 * going back from the most recent year.
 */
export function countConsecutivePayingYears(records: DividendRecord[]): number {
  if (records.length === 0) return 0;

  const yearSet = new Set(records.map((r) => r.year));
  const currentYear = new Date().getFullYear();
  let count = 0;

  for (let y = currentYear; y >= currentYear - 50; y--) {
    if (yearSet.has(y)) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Aggregate dividend records into annual totals.
 */
export function aggregateAnnualDividends(records: DividendRecord[]): AnnualDividend[] {
  const byYear = new Map<number, { total: number; count: number }>();

  for (const r of records) {
    const existing = byYear.get(r.year) ?? { total: 0, count: 0 };
    byYear.set(r.year, {
      total: existing.total + r.amount,
      count: existing.count + 1,
    });
  }

  return Array.from(byYear.entries())
    .map(([year, { total, count }]) => ({ year, total, count }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Calculate compound annual growth rate for dividends over a given number of years.
 */
export function calculateCAGR(records: DividendRecord[], years: number): number | null {
  const annuals = aggregateAnnualDividends(records);
  if (annuals.length < 2) return null;

  const sorted = [...annuals].sort((a, b) => b.year - a.year);
  const latest = sorted[0];
  const baseline = sorted.find((a) => a.year === latest.year - years);

  if (!baseline || baseline.total === 0) return null;

  return Math.pow(latest.total / baseline.total, 1 / years) - 1;
}

/**
 * Calculate year-over-year dividend growth rates.
 */
export function calculateDividendGrowthRates(records: DividendRecord[]): DividendGrowthRate[] {
  const annuals = aggregateAnnualDividends(records);
  const sorted = [...annuals].sort((a, b) => a.year - b.year);

  return sorted.map((item, i) => {
    if (i === 0) {
      return { year: item.year, growthRate: null, annualTotal: item.total };
    }
    const prev = sorted[i - 1];
    const growthRate = prev.total > 0 ? (item.total - prev.total) / prev.total : null;
    return { year: item.year, growthRate, annualTotal: item.total };
  });
}

/**
 * Detect dividend payment frequency based on the average number of payments per year.
 */
export function detectFrequency(records: DividendRecord[]): DividendFrequency {
  if (records.length === 0) return 'irregular';

  const annuals = aggregateAnnualDividends(records);
  if (annuals.length === 0) return 'irregular';

  // Use recent 3 years for frequency detection
  const recent = annuals.slice(-3);
  const avgPerYear = recent.reduce((sum, a) => sum + a.count, 0) / recent.length;

  if (avgPerYear >= 11) return 'monthly';
  if (avgPerYear >= 3.5) return 'quarterly';
  if (avgPerYear >= 1.5) return 'semi-annual';
  if (avgPerYear >= 0.8) return 'annual';
  return 'irregular';
}
