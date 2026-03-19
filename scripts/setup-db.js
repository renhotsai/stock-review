// Run: node scripts/setup-db.js
try { require('dotenv').config({ path: '.env.local' }); } catch { /* dotenv optional, Vercel injects env vars directly */ }
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('Creating / migrating tables...');

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

  // Add F.A.C.T.S columns (idempotent)
  const factsColumns = [
    "eps VARCHAR(10) DEFAULT 'EMPTY'",
    "fcf VARCHAR(10) DEFAULT 'EMPTY'",
    "roe VARCHAR(10) DEFAULT 'EMPTY'",
    "int_cov VARCHAR(20) DEFAULT 'EMPTY'",
    "moat VARCHAR(20) DEFAULT 'EMPTY'",
    "net_margin VARCHAR(20) DEFAULT 'EMPTY'",
    "has_dividends VARCHAR(10) DEFAULT 'EMPTY'",
    "policy VARCHAR(10) DEFAULT 'EMPTY'",
    "tech_risk VARCHAR(20) DEFAULT 'EMPTY'",
    "mgmt_risk VARCHAR(20) DEFAULT 'EMPTY'",
  ];

  const valuationColumns = [
    "eps_value DECIMAL(10,4)",
    "growth_rate DECIMAL(10,4)",
    "expected_dividend DECIMAL(10,4)",
    "dividend_return_rate DECIMAL(10,4) DEFAULT 0.04",
    "bvps DECIMAL(10,4)",
    "discount_factor DECIMAL(10,4) DEFAULT 0.8",
    "notes TEXT DEFAULT ''",
  ];

  for (const colDef of [...factsColumns, ...valuationColumns]) {
    const colName = colDef.split(' ')[0];
    try {
      await sql.unsafe(`ALTER TABLE stocks ADD COLUMN IF NOT EXISTS ${colDef}`);
      console.log(`  + column: ${colName}`);
    } catch (err) {
      // column may already exist
      console.log(`  ~ column ${colName}: ${err.message}`);
    }
  }

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

  console.log('Database setup complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
