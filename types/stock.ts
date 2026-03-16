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
