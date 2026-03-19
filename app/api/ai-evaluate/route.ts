import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { FullFinancials } from '@/types/financials';

export const maxDuration = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiEvalResult {
  name: string;
  type: 'Growth' | 'Dividends' | 'Asset';
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
  dividend_return_rate: number | null;
  bvps: number | null;
  discount_factor: number | null;
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function pct(v: number | null | undefined) {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
function num(v: number | null | undefined, d = 2) {
  if (v == null) return '—';
  return v.toFixed(d);
}
function big(v: number | null | undefined) {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function buildPrompt(symbol: string, fin: FullFinancials): string {
  const p = fin.profile;
  const m = fin.metrics;
  const annuals = fin.annuals ?? [];

  const profileSection = p ? `
COMPANY PROFILE:
  Name: ${p.name}
  Sector: ${p.sector} | Industry: ${p.industry}
  Country: ${p.country} | Exchange: ${p.exchange}
  Market Cap: ${big(p.marketCap)}
  Description: ${p.description?.slice(0, 300) ?? '—'}` : '';

  const metricsSection = m ? `
KEY METRICS (Trailing Twelve Months):
  Valuation: P/E ${num(m.peRatio, 1)}x | P/B ${num(m.pbRatio, 1)}x | P/S ${num(m.psRatio, 1)}x | EV/EBITDA ${num(m.evToEbitda, 1)}x
  Profitability: ROE ${pct(m.roe)} | ROA ${pct(m.roa)} | Net Margin ${pct(m.netMargin)} | Gross Margin ${pct(m.grossMargin)} | Op Margin ${pct(m.operatingMargin)}
  Per Share: EPS ${num(m.eps)} | Book Value ${num(m.bookValue)} | Annual Dividend ${num(m.dividendRate)}
  Dividends: Yield ${pct(m.dividendYield)} | Payout Ratio ${pct(m.payoutRatio)}
  Leverage: D/E ${num(m.debtToEquity, 1)} | Current Ratio ${num(m.currentRatio, 2)}
  Beta: ${num(m.beta)} | 52w Range: $${num(m.fiftyTwoWeekLow)} – $${num(m.fiftyTwoWeekHigh)}` : '';

  const annualSection = annuals.length > 0 ? `
ANNUAL FINANCIALS (newest first):
${annuals.map(a =>
    `  ${a.year}: Revenue ${big(a.revenue)} | Net Income ${big(a.netIncome)} | EPS $${num(a.eps)} | FCF ${big(a.freeCashFlow)} | Net Margin ${pct(a.netMargin)} | Op Margin ${pct(a.operatingMargin)}`
  ).join('\n')}` : '';

  return `You are a professional stock analyst. Analyze ${symbol} and fill in ALL fields of an investment tracking form.
${profileSection}${metricsSection}${annualSection}

Return ONLY a valid JSON object with exactly these fields and values:

{
  "name": "Full company name",
  "type": "Growth" | "Dividends" | "Asset",

  // F.A.C.T.S evaluation
  "eps":          "YES" | "NO" | "EMPTY",   // EPS growing consistently over 3+ years?
  "fcf":          "YES" | "NO" | "EMPTY",   // Free cash flow consistently positive?
  "roe":          "YES" | "NO" | "EMPTY",   // ROE > 15% (use economic ROE, not distorted by buybacks)?
  "int_cov":      "ABOVE_10" | "ABOVE_4" | "NO_DEBT" | "NO" | "EMPTY",  // Interest coverage strength
  "moat":         "TWO_MOATS" | "ONE_MOAT" | "NO" | "EMPTY",  // Brand, network, cost, switching cost moats
  "net_margin":   "ABOVE_20" | "ABOVE_10" | "INCREASING" | "NO" | "EMPTY",  // Net margin quality
  "has_dividends":"YES" | "NO" | "EMPTY",   // Currently paying dividends?
  "policy":       "YES" | "NO" | "EMPTY",   // Shareholder-friendly (buybacks, dividends, low dilution)?
  "tech_risk":    "LOW" | "MEDIUM" | "HIGH" | "EMPTY",  // Disruption risk from technology
  "mgmt_risk":    "LOW" | "MEDIUM" | "HIGH" | "EMPTY",  // Management quality and governance risk

  // Valuation inputs (null if not applicable for this stock type)
  "eps_value":          number | null,   // TTM EPS (for Growth: use as earnings base)
  "growth_rate":        number | null,   // Growth: PE multiple to apply (e.g. 15 for steady grower, 25 for fast grower)
  "expected_dividend":  number | null,   // Annual dividend per share in dollars
  "dividend_return_rate": number | null, // Target dividend yield as decimal (e.g. 0.04 = 4%)
  "bvps":               number | null,   // Book value per share (null if negative or not applicable)
  "discount_factor":    number | null    // Asset type discount (e.g. 0.8)
}

Rules:
- type: "Dividends" if paying regular dividends; "Growth" if high revenue growth + no/low dividend; "Asset" if valued on book value
- roe: For companies with negative equity from buybacks (like KO, MCD), evaluate true earnings power ROE instead; mark YES if economically strong
- int_cov: NO_DEBT if D/E < 0.5; ABOVE_10 if interest coverage > 10x; ABOVE_4 if 4–10x; NO if < 4x
- moat: Consider brand strength, pricing power, network effects, cost advantages, switching costs
- growth_rate: Conservative PE multiple reflecting sustainable growth (10–30 range); e.g. 15 for 5% grower, 20 for 10% grower
- dividend_return_rate: typical target yield for this sector (e.g. 0.03–0.05 for blue-chip consumer staples)
- Use EMPTY only when truly no data is available`;
}

// ── Output sanitizer ──────────────────────────────────────────────────────────

function sanitize(raw: Record<string, unknown>, symbol: string, fin: FullFinancials): AiEvalResult {
  const pick = <T>(v: unknown, allowed: T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const safeNum = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  };

  return {
    name: typeof raw.name === 'string' && raw.name ? raw.name : (fin.profile?.name ?? symbol),
    type: pick(raw.type, ['Growth', 'Dividends', 'Asset'] as const, 'Dividends'),
    eps:          pick(raw.eps,          ['YES', 'NO', 'EMPTY'],                              'EMPTY'),
    fcf:          pick(raw.fcf,          ['YES', 'NO', 'EMPTY'],                              'EMPTY'),
    roe:          pick(raw.roe,          ['YES', 'NO', 'EMPTY'],                              'EMPTY'),
    int_cov:      pick(raw.int_cov,      ['ABOVE_10', 'ABOVE_4', 'NO_DEBT', 'NO', 'EMPTY'],  'EMPTY'),
    moat:         pick(raw.moat,         ['TWO_MOATS', 'ONE_MOAT', 'NO', 'EMPTY'],           'EMPTY'),
    net_margin:   pick(raw.net_margin,   ['ABOVE_20', 'ABOVE_10', 'INCREASING', 'NO', 'EMPTY'], 'EMPTY'),
    has_dividends:pick(raw.has_dividends,['YES', 'NO', 'EMPTY'],                              'EMPTY'),
    policy:       pick(raw.policy,       ['YES', 'NO', 'EMPTY'],                              'EMPTY'),
    tech_risk:    pick(raw.tech_risk,    ['LOW', 'MEDIUM', 'HIGH', 'EMPTY'],                  'EMPTY'),
    mgmt_risk:    pick(raw.mgmt_risk,    ['LOW', 'MEDIUM', 'HIGH', 'EMPTY'],                  'EMPTY'),
    eps_value:          safeNum(raw.eps_value),
    growth_rate:        safeNum(raw.growth_rate),
    expected_dividend:  safeNum(raw.expected_dividend),
    dividend_return_rate: safeNum(raw.dividend_return_rate),
    bvps:               safeNum(raw.bvps),
    discount_factor:    safeNum(raw.discount_factor),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json();
  const symbol: string = body.symbol ?? '';
  const financials: FullFinancials = body.financials;

  if (!symbol || !financials) {
    return NextResponse.json({ error: 'symbol and financials required' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[ai-evaluate] OPENAI_API_KEY not set');
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const prompt = buildPrompt(symbol.toUpperCase(), financials);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial analyst. Always respond with valid JSON only, no markdown or extra text.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const raw = JSON.parse(completion.choices[0].message.content ?? '{}') as Record<string, unknown>;
    return NextResponse.json(sanitize(raw, symbol, financials));
  } catch (err) {
    console.error('[ai-evaluate] OpenAI call failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
