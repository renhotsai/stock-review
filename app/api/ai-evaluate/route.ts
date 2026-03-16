import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const { profile, metrics, annuals } = await request.json();

    const annualRows = (annuals ?? []).slice(0, 4).map((a: {
      year: number;
      revenue: number | null;
      netIncome: number | null;
      eps: number | null;
      freeCashFlow: number | null;
      operatingIncome: number | null;
    }) =>
      `  ${a.year}: Revenue=${a.revenue ? '$' + (a.revenue / 1e9).toFixed(2) + 'B' : 'N/A'}, NetIncome=${a.netIncome ? '$' + (a.netIncome / 1e9).toFixed(2) + 'B' : 'N/A'}, EPS=${a.eps ?? 'N/A'}, FCF=${a.freeCashFlow != null ? '$' + (a.freeCashFlow / 1e9).toFixed(2) + 'B' : 'N/A'}, OperatingIncome=${a.operatingIncome ? '$' + (a.operatingIncome / 1e9).toFixed(2) + 'B' : 'N/A'}`
    ).join('\n');

    const prompt = `You are a value investing analyst. Evaluate this stock based on all available data.

Company: ${profile?.name ?? 'Unknown'} (${profile?.sector ?? ''} / ${profile?.industry ?? ''})

Key Metrics:
- ROE: ${metrics?.roe != null ? (metrics.roe * 100).toFixed(1) + '%' : 'N/A'}
- Net Margin: ${metrics?.netMargin != null ? (metrics.netMargin * 100).toFixed(1) + '%' : 'N/A'}
- Operating Margin: ${metrics?.operatingMargin != null ? (metrics.operatingMargin * 100).toFixed(1) + '%' : 'N/A'}
- Gross Margin: ${metrics?.grossMargin != null ? (metrics.grossMargin * 100).toFixed(1) + '%' : 'N/A'}
- Debt/Equity: ${metrics?.debtToEquity ?? 'N/A'}
- Current Ratio: ${metrics?.currentRatio ?? 'N/A'}
- Dividend Yield: ${metrics?.dividendYield != null ? (metrics.dividendYield * 100).toFixed(2) + '%' : 'N/A'}
- Payout Ratio: ${metrics?.payoutRatio != null ? (metrics.payoutRatio * 100).toFixed(1) + '%' : 'N/A'}
- EPS (TTM): ${metrics?.eps ?? 'N/A'}
- Book Value/Share: ${metrics?.bookValue ?? 'N/A'}
- PE Ratio: ${metrics?.peRatio ?? 'N/A'}

Annual Financials (most recent first):
${annualRows || '  N/A'}

Respond ONLY with a valid JSON object (no markdown, no explanation):

{
  "type": "Growth" | "Dividends" | "Asset",
  "eps": "YES" | "NO",
  "fcf": "YES" | "NO",
  "roe": "YES" | "NO",
  "int_cov": "ABOVE_10" | "ABOVE_4" | "NO_DEBT" | "NO",
  "moat": "TWO_MOATS" | "ONE_MOAT" | "NO",
  "net_margin": "ABOVE_20" | "ABOVE_10" | "INCREASING" | "NO",
  "has_dividends": "YES" | "NO",
  "policy": "YES" | "NO",
  "tech_risk": "LOW" | "MEDIUM" | "HIGH",
  "mgmt_risk": "LOW" | "MEDIUM" | "HIGH"
}

Definitions:
- type: "Dividends"=mature consistent dividend payer (yield>1.5%). "Asset"=bank/insurance/real estate/capital-heavy (book value is key metric). "Growth"=high growth, reinvests earnings, low/no dividends.
- eps: "YES" if EPS has been growing consistently over the last 3+ years, "NO" otherwise.
- fcf: "YES" if free cash flow is positive in the most recent year, "NO" if negative.
- roe: "YES" if ROE > 15%, "NO" otherwise.
- int_cov: Interest coverage (operating income / interest expense). "ABOVE_10"=very safe, "ABOVE_4"=adequate, "NO_DEBT"=no significant debt, "NO"=insufficient or negative.
- moat: "TWO_MOATS"=2+ competitive advantages (brand+network/cost/switching), "ONE_MOAT"=one clear advantage, "NO"=no clear moat.
- net_margin: "ABOVE_20"=net margin>20%, "ABOVE_10"=>10%, "INCREASING"=improving trend even if below 10%, "NO"=low and not improving.
- has_dividends: "YES" if company pays regular dividends, "NO" otherwise.
- policy: "YES" if shareholder-friendly (consistent buybacks/dividends, reasonable exec pay), "NO" otherwise.
- tech_risk: "LOW"=stable/defensive industry, "MEDIUM"=some disruption risk, "HIGH"=significant disruption risk.
- mgmt_risk: "LOW"=strong proven management, "MEDIUM"=some concerns, "HIGH"=significant concerns.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 500 });
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('AI evaluate error:', error);
    return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 });
  }
}
