export type StockType = 'Growth' | 'Dividends' | 'Asset';

export type FactsValue =
  | 'EMPTY'
  | 'YES'
  | 'NO'
  | 'ABOVE_10'
  | 'ABOVE_4'
  | 'NO_DEBT'
  | 'TWO_MOATS'
  | 'ONE_MOAT'
  | 'ABOVE_20'
  | 'ABOVE_10'
  | 'INCREASING'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface Stock {
  id: number;
  symbol: string;
  name: string | null;
  type: StockType;
  score: number | null;
  entry_price: number | null;
  review_price: number | null;
  added_date: string | null;
  created_at: string;
  updated_at: string;
  // F.A.C.T.S
  eps: string;
  fcf: string;
  roe: string;
  int_cov: string;
  moat: string;
  net_margin: string;
  has_dividends: string;
  policy: string;
  tech_risk: string;
  mgmt_risk: string;
  // Valuation inputs
  eps_value: number | null;
  growth_rate: number | null;
  expected_dividend: number | null;
  dividend_return_rate: number;
  bvps: number | null;
  discount_factor: number;
  notes: string;
}

export interface StockWithPrice extends Stock {
  current_price: number | null;
  price_error?: boolean;
}

// ── AI Payload (returned by /api/stocks/analyze) ───────────────────────────

export interface StockAIPayload {
  ticker: string;
  type: StockType;
  name: string;

  // Current price (fetched by AI via web search)
  currentPrice: number | null;
  currency: string;

  // Valuation inputs (map to existing DB columns)
  eps_value: number | null;        // Growth: TTM EPS
  growth_rate: number | null;      // Growth: PE multiple
  expected_dividend: number | null; // Dividends: annual dividend per share
  dividend_return_rate: number | null; // Dividends: target yield (e.g. 0.04)
  bvps: number | null;             // Asset: book value per share
  discount_factor: number | null;  // Asset: discount rate (e.g. 0.8)

  // F.A.C.T.S (same enum values as DB)
  eps: string;
  fcf: string;
  roe: string;
  int_cov: string;
  moat: string;
  net_margin: string;
  has_dividends: string;
  policy: string;
  tech_risk: string;
  mgmt_risk: string;

  // AI metadata
  notes: string;
  dataSource: string;
  priceAsOf: string;    // YYYY-MM-DD
  confidence: 'High' | 'Medium' | 'Low';
}
