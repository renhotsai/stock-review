import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const stocks = await sql`
      SELECT * FROM stocks ORDER BY symbol ASC
    `;
    return NextResponse.json(stocks);
  } catch (error) {
    console.error('GET /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      symbol, name, type, score, entry_price, review_price, added_date,
      eps, fcf, roe, int_cov, moat, net_margin, has_dividends, policy, tech_risk, mgmt_risk,
      eps_value, growth_rate, expected_dividend, dividend_return_rate, bvps, discount_factor, notes,
      data_source, price_as_of, ai_confidence,
    } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    const [stock] = await sql`
      INSERT INTO stocks (
        symbol, name, type, score, entry_price, review_price, added_date,
        eps, fcf, roe, int_cov, moat, net_margin, has_dividends, policy, tech_risk, mgmt_risk,
        eps_value, growth_rate, expected_dividend, dividend_return_rate, bvps, discount_factor, notes,
        data_source, price_as_of, ai_confidence
      )
      VALUES (
        ${symbol.toUpperCase()},
        ${name ?? null},
        ${type ?? null},
        ${score ?? 0},
        ${entry_price ?? null},
        ${review_price ?? null},
        ${added_date ?? null},
        ${eps ?? 'EMPTY'},
        ${fcf ?? 'EMPTY'},
        ${roe ?? 'EMPTY'},
        ${int_cov ?? 'EMPTY'},
        ${moat ?? 'EMPTY'},
        ${net_margin ?? 'EMPTY'},
        ${has_dividends ?? 'EMPTY'},
        ${policy ?? 'EMPTY'},
        ${tech_risk ?? 'EMPTY'},
        ${mgmt_risk ?? 'EMPTY'},
        ${eps_value ?? null},
        ${growth_rate ?? null},
        ${expected_dividend ?? null},
        ${dividend_return_rate ?? 0.04},
        ${bvps ?? null},
        ${discount_factor ?? 0.8},
        ${notes ?? ''},
        ${data_source ?? null},
        ${price_as_of ?? null},
        ${ai_confidence ?? 'Low'}
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
        data_source          = EXCLUDED.data_source,
        price_as_of          = EXCLUDED.price_as_of,
        ai_confidence        = EXCLUDED.ai_confidence,
        updated_at           = NOW()
      RETURNING *
    `;

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    console.error('POST /api/stocks error:', error);
    return NextResponse.json({ error: 'Failed to create stock' }, { status: 500 });
  }
}
