export interface CompanyProfile {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  employees: number | null;
  website: string;
  country: string;
  exchange: string;
  currency: string;
  marketCap: number | null;
  logo: string;
}

export interface KeyMetrics {
  ticker: string;
  peRatio: number | null;
  pbRatio: number | null;
  psRatio: number | null;
  evToEbitda: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  roe: number | null;
  roa: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  eps: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  dividendRate: number | null;
  payoutRatio: number | null;
  beta: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  averageVolume: number | null;
  revenueGrowth: number | null;
  freeCashflow: number | null;
}

export interface AnnualFinancial {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  freeCashFlow: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

export interface DividendRecord {
  date: string;
  amount: number;
  year: number;
}

export interface PricePoint {
  date: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

export interface FullFinancials {
  profile: CompanyProfile | null;
  metrics: KeyMetrics | null;
  annuals: AnnualFinancial[];
  fetchedAt: string;
}
