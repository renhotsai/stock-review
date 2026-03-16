import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const { profile, metrics, annuals } = await request.json();

    const prompt = `You are a value investing analyst. Based on the following financial data, evaluate the stock using the F.A.C.T.S framework.

Company: ${profile?.name ?? 'Unknown'} (${profile?.sector ?? ''}, ${profile?.industry ?? ''})

Key Metrics:
- ROE: ${metrics?.roe != null ? (metrics.roe * 100).toFixed(1) + '%' : 'N/A'}
- Net Margin: ${metrics?.netMargin != null ? (metrics.netMargin * 100).toFixed(1) + '%' : 'N/A'}
- Debt to Equity: ${metrics?.debtToEquity ?? 'N/A'}
- Dividend Yield: ${metrics?.dividendYield != null ? (metrics.dividendYield * 100).toFixed(2) + '%' : 'N/A'}
- EPS: ${metrics?.eps ?? 'N/A'}
- Book Value per Share: ${metrics?.bookValue ?? 'N/A'}
- PE Ratio: ${metrics?.peRatio ?? 'N/A'}
- Current Ratio: ${metrics?.currentRatio ?? 'N/A'}
- Operating Margin: ${metrics?.operatingMargin != null ? (metrics.operatingMargin * 100).toFixed(1) + '%' : 'N/A'}

Recent Annual Financials (most recent first):
${(annuals ?? []).slice(0, 3).map((a: { year: number; revenue: number | null; netIncome: number | null; eps: number | null; freeCashFlow: number | null; operatingIncome: number | null }) =>
  `Year ${a.year}: Revenue=${a.revenue ? '$' + (a.revenue / 1e9).toFixed(1) + 'B' : 'N/A'}, Net Income=${a.netIncome ? '$' + (a.netIncome / 1e9).toFixed(1) + 'B' : 'N/A'}, EPS=${a.eps ?? 'N/A'}, FCF=${a.freeCashFlow ? '$' + (a.freeCashFlow / 1e9).toFixed(1) + 'B' : 'N/A'}`
).join('\n')}

Evaluate the following criteria and respond ONLY with a JSON object (no markdown, no explanation):

{
  "type": "Growth" | "Dividends" | "Asset",
  "moat": "TWO_MOATS" | "ONE_MOAT" | "NO",
  "int_cov": "ABOVE_10" | "ABOVE_4" | "NO_DEBT" | "NO",
  "policy": "YES" | "NO",
  "tech_risk": "LOW" | "MEDIUM" | "HIGH",
  "mgmt_risk": "LOW" | "MEDIUM" | "HIGH"
}

Criteria definitions:
- type: Investment classification. "Dividends" = mature company, consistent dividend payer (yield > 1.5%), stable cash flows. "Asset" = bank, insurance, real estate, capital-heavy industries where book value is the primary metric. "Growth" = high revenue/earnings growth, reinvests earnings, low/no dividends, tech/innovation sector.
- moat: Economic moat (competitive advantage). TWO_MOATS = strong moat (brand + cost/network/switching), ONE_MOAT = one clear advantage, NO = no clear moat
- int_cov: Interest coverage (operating income / interest expense). ABOVE_10 = very safe, ABOVE_4 = adequate, NO_DEBT = no debt, NO = insufficient
- policy: Shareholder-friendly policy (consistent buybacks/dividends, reasonable executive pay). YES or NO
- tech_risk: Risk of disruption by technology. LOW = stable/necessary industry, MEDIUM = some risk, HIGH = high risk of disruption
- mgmt_risk: Management quality risk. LOW = strong proven management, MEDIUM = some concerns, HIGH = significant concerns`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Parse JSON from response
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
