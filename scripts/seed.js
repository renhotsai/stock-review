// Run: node scripts/seed.js
// Pre-populate with data from your Google Sheet (BOS表格V7.3)
try { require('dotenv').config({ path: '.env.local' }); } catch { /* dotenv optional */ }
const { neon } = require('@neondatabase/serverless');

const STOCKS = [
  {
    symbol: 'AAPL',  name: 'Apple Inc.',                 type: 'Dividends',
    score: 8,   entry_price: 57.25,  review_price: 85.88,  added_date: '2019-09-06',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'NO_DEBT', moat: 'TWO_MOATS',
    net_margin: 'ABOVE_20', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    expected_dividend: 0.96, dividend_return_rate: 0.04, notes: 'iPhone ecosystem moat',
  },
  {
    symbol: 'DIS',   name: 'Walt Disney Co.',             type: 'Growth',
    score: 8.5, entry_price: 107.35, review_price: 128.82, added_date: '2019-09-06',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'ABOVE_4', moat: 'TWO_MOATS',
    net_margin: 'ABOVE_10', has_dividends: 'YES', policy: 'YES', tech_risk: 'MEDIUM', mgmt_risk: 'MEDIUM',
    eps_value: 5.0, growth_rate: 21.47, notes: 'Streaming + parks recovery',
  },
  {
    symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.',     type: 'Asset',
    score: 7,   entry_price: 249.71, review_price: 208.09, added_date: '2020-08-16',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'NO_DEBT', moat: 'TWO_MOATS',
    net_margin: 'ABOVE_10', has_dividends: 'NO', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    bvps: 260.0, discount_factor: 0.96, notes: 'Buffett holding company, asset play',
  },
  {
    symbol: 'COST',  name: 'Costco Wholesale Corp.',      type: 'Growth',
    score: 8.5, entry_price: 101.82, review_price: 122.19, added_date: '2020-07-12',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'ABOVE_10', moat: 'TWO_MOATS',
    net_margin: 'ABOVE_10', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    eps_value: 4.0, growth_rate: 25.45, notes: 'Membership model, high retention',
  },
  {
    symbol: 'KR',    name: 'Kroger Co.',                  type: 'Growth',
    score: 8.5, entry_price: 46.44,  review_price: 55.73,  added_date: '2020-11-21',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'ABOVE_4', moat: 'ONE_MOAT',
    net_margin: 'ABOVE_10', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    eps_value: 3.0, growth_rate: 15.48, notes: 'Grocery recession-resistant',
  },
  {
    symbol: 'BCBP',  name: 'BCB Bancorp Inc.',            type: 'Dividends',
    score: 7.5, entry_price: 14.00,  review_price: 21.00,  added_date: '2021-09-08',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'NO_DEBT', moat: 'ONE_MOAT',
    net_margin: 'ABOVE_20', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    expected_dividend: 0.64, dividend_return_rate: 0.04,
  },
  {
    symbol: 'MCBC',  name: 'Mackinac Savings Bank',       type: 'Dividends',
    score: 7.5, entry_price: 8.00,   review_price: 12.00,  added_date: '2021-09-09',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'NO_DEBT', moat: 'ONE_MOAT',
    net_margin: 'ABOVE_20', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    expected_dividend: 0.32, dividend_return_rate: 0.04,
  },
  {
    symbol: 'MFC',   name: 'Manulife Financial Corp.',    type: 'Dividends',
    score: 7.5, entry_price: 22.00,  review_price: 33.00,  added_date: '2021-09-09',
    eps: 'YES', fcf: 'YES', roe: 'YES', int_cov: 'ABOVE_4', moat: 'ONE_MOAT',
    net_margin: 'ABOVE_10', has_dividends: 'YES', policy: 'YES', tech_risk: 'LOW', mgmt_risk: 'LOW',
    expected_dividend: 0.88, dividend_return_rate: 0.04,
  },
  {
    symbol: 'ACNB',  name: 'ACNB Corp.',                  type: 'Dividends',
    score: 0,   entry_price: 25.00,  review_price: 37.50,  added_date: '2021-09-09',
    eps: 'EMPTY', fcf: 'EMPTY', roe: 'EMPTY', int_cov: 'EMPTY', moat: 'EMPTY',
    net_margin: 'EMPTY', has_dividends: 'YES', policy: 'EMPTY', tech_risk: 'EMPTY', mgmt_risk: 'EMPTY',
    expected_dividend: 1.0, dividend_return_rate: 0.04,
  },
  {
    symbol: 'O',     name: 'Realty Income Corp.',         type: 'Dividends',
    score: 0,   entry_price: 70.25,  review_price: 105.38, added_date: '2021-09-09',
    eps: 'EMPTY', fcf: 'EMPTY', roe: 'EMPTY', int_cov: 'EMPTY', moat: 'EMPTY',
    net_margin: 'EMPTY', has_dividends: 'YES', policy: 'EMPTY', tech_risk: 'EMPTY', mgmt_risk: 'EMPTY',
    expected_dividend: 2.81, dividend_return_rate: 0.04,
  },
  {
    symbol: 'SBUX',  name: 'Starbucks Corp.',             type: 'Dividends',
    score: 0,   entry_price: 44.00,  review_price: 66.00,  added_date: '2021-09-09',
    eps: 'EMPTY', fcf: 'EMPTY', roe: 'EMPTY', int_cov: 'EMPTY', moat: 'EMPTY',
    net_margin: 'EMPTY', has_dividends: 'YES', policy: 'EMPTY', tech_risk: 'EMPTY', mgmt_risk: 'EMPTY',
    expected_dividend: 1.76, dividend_return_rate: 0.04,
  },
];

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  console.log(`Seeding ${STOCKS.length} stocks...`);

  for (const stock of STOCKS) {
    await sql`
      INSERT INTO stocks (
        symbol, name, type, score, entry_price, review_price, added_date,
        eps, fcf, roe, int_cov, moat, net_margin, has_dividends, policy, tech_risk, mgmt_risk,
        eps_value, growth_rate, expected_dividend, dividend_return_rate, bvps, discount_factor, notes
      )
      VALUES (
        ${stock.symbol},
        ${stock.name},
        ${stock.type},
        ${stock.score},
        ${stock.entry_price},
        ${stock.review_price},
        ${stock.added_date},
        ${stock.eps ?? 'EMPTY'},
        ${stock.fcf ?? 'EMPTY'},
        ${stock.roe ?? 'EMPTY'},
        ${stock.int_cov ?? 'EMPTY'},
        ${stock.moat ?? 'EMPTY'},
        ${stock.net_margin ?? 'EMPTY'},
        ${stock.has_dividends ?? 'EMPTY'},
        ${stock.policy ?? 'EMPTY'},
        ${stock.tech_risk ?? 'EMPTY'},
        ${stock.mgmt_risk ?? 'EMPTY'},
        ${stock.eps_value ?? null},
        ${stock.growth_rate ?? null},
        ${stock.expected_dividend ?? null},
        ${stock.dividend_return_rate ?? 0.04},
        ${stock.bvps ?? null},
        ${stock.discount_factor ?? 0.8},
        ${stock.notes ?? ''}
      )
      ON CONFLICT (symbol) DO UPDATE SET
        name                 = EXCLUDED.name,
        type                 = EXCLUDED.type,
        score                = EXCLUDED.score,
        entry_price          = EXCLUDED.entry_price,
        review_price         = EXCLUDED.review_price,
        added_date           = EXCLUDED.added_date,
        eps                  = EXCLUDED.eps,
        fcf                  = EXCLUDED.fcf,
        roe                  = EXCLUDED.roe,
        int_cov              = EXCLUDED.int_cov,
        moat                 = EXCLUDED.moat,
        net_margin           = EXCLUDED.net_margin,
        has_dividends        = EXCLUDED.has_dividends,
        policy               = EXCLUDED.policy,
        tech_risk            = EXCLUDED.tech_risk,
        mgmt_risk            = EXCLUDED.mgmt_risk,
        eps_value            = EXCLUDED.eps_value,
        growth_rate          = EXCLUDED.growth_rate,
        expected_dividend    = EXCLUDED.expected_dividend,
        dividend_return_rate = EXCLUDED.dividend_return_rate,
        bvps                 = EXCLUDED.bvps,
        discount_factor      = EXCLUDED.discount_factor,
        notes                = EXCLUDED.notes,
        updated_at           = NOW()
    `;
    console.log(`  + ${stock.symbol}`);
  }

  console.log('Seed complete!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
