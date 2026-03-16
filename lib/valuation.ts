import { Stock } from '@/lib/db';

export interface ValuationResult {
  fairValue: number | null;
  reviewValue: number | null;
  score: number;
}

export type PriceStatus = 'undervalued' | 'fair' | 'overvalued' | 'unknown';

export function calculateValuation(stock: Stock): ValuationResult {
  const score = calculateScore(stock);
  let fairValue: number | null = null;
  let reviewValue: number | null = null;

  if (stock.type === 'Growth') {
    if (stock.eps_value != null && stock.growth_rate != null) {
      fairValue = stock.eps_value * stock.growth_rate;
      reviewValue = fairValue * 1.2;
    }
  } else if (stock.type === 'Dividends') {
    if (stock.expected_dividend != null && stock.dividend_return_rate) {
      fairValue = stock.expected_dividend / stock.dividend_return_rate;
      reviewValue = fairValue * 1.5;
    }
  } else if (stock.type === 'Asset') {
    if (stock.bvps != null) {
      const df = stock.discount_factor ?? 0.8;
      fairValue = stock.bvps * df;
      reviewValue = stock.bvps;
    }
  }

  return { fairValue, reviewValue, score };
}

export function calculateScore(stock: Stock): number {
  let score = 0;

  // EPS
  if (stock.eps === 'YES') score += 1;

  // FCF
  if (stock.fcf === 'YES') score += 1;

  // ROE
  if (stock.roe === 'YES') score += 1;

  // Interest Coverage
  if (stock.int_cov === 'ABOVE_10') score += 1;
  else if (stock.int_cov === 'ABOVE_4') score += 0.5;
  else if (stock.int_cov === 'NO_DEBT') score += 1;

  // Moat
  if (stock.moat === 'TWO_MOATS') score += 1;
  else if (stock.moat === 'ONE_MOAT') score += 0.5;

  // Net Margin
  if (stock.net_margin === 'ABOVE_20') score += 1;
  else if (stock.net_margin === 'ABOVE_10' || stock.net_margin === 'INCREASING') score += 0.5;

  // Dividends
  if (stock.has_dividends === 'YES') score += 1;

  // Policy (shareholder friendly)
  if (stock.policy === 'YES') score += 0.5;

  // Tech Risk (LOW risk = good, HIGH risk = bad)
  if (stock.tech_risk === 'LOW') score += 0.5;
  else if (stock.tech_risk === 'HIGH') score -= 0.5;

  // Management Risk
  if (stock.mgmt_risk === 'LOW') score += 0.5;
  else if (stock.mgmt_risk === 'HIGH') score -= 0.5;

  return Math.max(0, Math.min(10, score));
}

export function getPriceStatus(
  currentPrice: number | null,
  fairValue: number | null,
  reviewValue: number | null
): PriceStatus {
  if (currentPrice == null || fairValue == null) return 'unknown';

  if (currentPrice <= fairValue) return 'undervalued';
  if (reviewValue != null && currentPrice <= reviewValue) return 'fair';
  return 'overvalued';
}
