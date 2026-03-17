import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const sql = neon(url);

  console.log('Running migration: adding missing columns to stocks table...');

  await sql`
    ALTER TABLE stocks
      ADD COLUMN IF NOT EXISTS eps                  VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS fcf                  VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS roe                  VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS int_cov              VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS moat                 VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS net_margin           VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS has_dividends        VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS policy               VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS tech_risk            VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS mgmt_risk            VARCHAR(20) DEFAULT 'EMPTY',
      ADD COLUMN IF NOT EXISTS eps_value            DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS growth_rate          DECIMAL(5,4),
      ADD COLUMN IF NOT EXISTS expected_dividend    DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS dividend_return_rate DECIMAL(5,4) DEFAULT 0.04,
      ADD COLUMN IF NOT EXISTS bvps                 DECIMAL(10,4),
      ADD COLUMN IF NOT EXISTS discount_factor      DECIMAL(5,4) DEFAULT 0.8,
      ADD COLUMN IF NOT EXISTS notes                TEXT DEFAULT ''
  `;

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
