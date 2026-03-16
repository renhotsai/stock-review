import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// sql tagged template tag — lazy initialized
export const sql: NeonQueryFunction<false, false> = new Proxy(
  function () {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      const db = getSql();
      return (db as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_target, prop) {
      const db = getSql();
      const val = (db as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof val === 'function') return (val as Function).bind(db);
      return val;
    },
  }
);

export type StockType = 'Growth' | 'Dividends' | 'Asset';

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

export type Notification = {
  id: number;
  symbol: string;
  current_price: number;
  entry_price: number;
  sent_at: string;
};

export interface FinancialCache {
  id: string;
  ticker: string;
  data_type: string;
  data: unknown;
  fetched_at: string;
  expires_at: string;
}

export async function getFinancialCache<T>(ticker: string, dataType: string): Promise<T | null> {
  const rows = await sql`
    SELECT data FROM financial_cache
    WHERE ticker = ${ticker.toUpperCase()}
      AND data_type = ${dataType}
      AND expires_at > NOW()
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0].data as T;
}

export async function setFinancialCache(
  ticker: string,
  dataType: string,
  data: unknown,
  ttlDays: number
): Promise<void> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO financial_cache (id, ticker, data_type, data, expires_at)
    VALUES (${id}, ${ticker.toUpperCase()}, ${dataType}, ${JSON.stringify(data)}, ${expiresAt})
    ON CONFLICT (ticker, data_type) DO UPDATE SET
      id         = EXCLUDED.id,
      data       = EXCLUDED.data,
      fetched_at = NOW(),
      expires_at = EXCLUDED.expires_at
  `;
}

export async function setupDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS stocks (
      id           SERIAL PRIMARY KEY,
      symbol       VARCHAR(20)   UNIQUE NOT NULL,
      name         VARCHAR(100),
      type         VARCHAR(20),
      score        DECIMAL(4,1)  DEFAULT 0,
      entry_price  DECIMAL(10,2),
      review_price DECIMAL(10,2),
      added_date   DATE,
      created_at   TIMESTAMPTZ   DEFAULT NOW(),
      updated_at   TIMESTAMPTZ   DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id            SERIAL PRIMARY KEY,
      symbol        VARCHAR(20)   NOT NULL,
      current_price DECIMAL(10,2) NOT NULL,
      entry_price   DECIMAL(10,2) NOT NULL,
      sent_at       TIMESTAMPTZ   DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS financial_cache (
      id         TEXT PRIMARY KEY,
      ticker     TEXT NOT NULL,
      data_type  TEXT NOT NULL,
      data       JSONB NOT NULL,
      fetched_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      UNIQUE(ticker, data_type)
    )
  `;
}
