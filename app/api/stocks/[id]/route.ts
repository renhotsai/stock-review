import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const [stock] = await sql`SELECT * FROM stocks WHERE id = ${id}`;
    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }
    return NextResponse.json(stock);
  } catch (error) {
    console.error('GET /api/stocks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const {
      symbol, name, type, score, entry_price, review_price, added_date,
      eps, fcf, roe, int_cov, moat, net_margin, has_dividends, policy, tech_risk, mgmt_risk,
      eps_value, growth_rate, expected_dividend, dividend_return_rate, bvps, discount_factor, notes,
      data_source, price_as_of, ai_confidence,
    } = body;

    const [stock] = await sql`
      UPDATE stocks SET
        name                 = ${name ?? null},
        type                 = ${type ?? null},
        score                = ${score ?? 0},
        entry_price          = ${entry_price ?? null},
        review_price         = ${review_price ?? null},
        added_date           = ${added_date ?? null},
        eps                  = ${eps ?? 'EMPTY'},
        fcf                  = ${fcf ?? 'EMPTY'},
        roe                  = ${roe ?? 'EMPTY'},
        int_cov              = ${int_cov ?? 'EMPTY'},
        moat                 = ${moat ?? 'EMPTY'},
        net_margin           = ${net_margin ?? 'EMPTY'},
        has_dividends        = ${has_dividends ?? 'EMPTY'},
        policy               = ${policy ?? 'EMPTY'},
        tech_risk            = ${tech_risk ?? 'EMPTY'},
        mgmt_risk            = ${mgmt_risk ?? 'EMPTY'},
        eps_value            = ${eps_value ?? null},
        growth_rate          = ${growth_rate ?? null},
        expected_dividend    = ${expected_dividend ?? null},
        dividend_return_rate = ${dividend_return_rate ?? 0.04},
        bvps                 = ${bvps ?? null},
        discount_factor      = ${discount_factor ?? 0.8},
        notes                = ${notes ?? ''},
        data_source          = ${data_source ?? null},
        price_as_of          = ${price_as_of ?? null},
        ai_confidence        = ${ai_confidence ?? 'Low'},
        updated_at           = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    // Suppress unused variable warning
    void symbol;

    return NextResponse.json(stock);
  } catch (error) {
    console.error('PUT /api/stocks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    await sql`DELETE FROM stocks WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/stocks/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete stock' }, { status: 500 });
  }
}
