import Anthropic from '@anthropic-ai/sdk';
import type { StockAIPayload, StockType } from '@/types/stock';

// ── Sanitizer ─────────────────────────────────────────────────────────────────

function pick<T>(v: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function safeNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

function sanitizePayload(raw: Record<string, unknown>, ticker: string, type: StockType): StockAIPayload {
  return {
    ticker: ticker.toUpperCase(),
    type,
    name: typeof raw.name === 'string' && raw.name ? raw.name : ticker,
    currentPrice: safeNum(raw.currentPrice),
    currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
    // Valuation inputs
    eps_value: safeNum(raw.eps_value),
    growth_rate: safeNum(raw.growth_rate),
    expected_dividend: safeNum(raw.expected_dividend),
    dividend_return_rate: safeNum(raw.dividend_return_rate) ?? 0.04,
    bvps: safeNum(raw.bvps),
    discount_factor: safeNum(raw.discount_factor) ?? 0.8,
    // F.A.C.T.S
    eps:           pick(raw.eps,           ['YES', 'NO', 'EMPTY'],                             'EMPTY'),
    fcf:           pick(raw.fcf,           ['YES', 'NO', 'EMPTY'],                             'EMPTY'),
    roe:           pick(raw.roe,           ['YES', 'NO', 'EMPTY'],                             'EMPTY'),
    int_cov:       pick(raw.int_cov,       ['ABOVE_10', 'ABOVE_4', 'NO_DEBT', 'NO', 'EMPTY'], 'EMPTY'),
    moat:          pick(raw.moat,          ['TWO_MOATS', 'ONE_MOAT', 'NO', 'EMPTY'],          'EMPTY'),
    net_margin:    pick(raw.net_margin,    ['ABOVE_20', 'ABOVE_10', 'INCREASING', 'NO', 'EMPTY'], 'EMPTY'),
    has_dividends: pick(raw.has_dividends, ['YES', 'NO', 'EMPTY'],                             'EMPTY'),
    policy:        pick(raw.policy,        ['YES', 'NO', 'EMPTY'],                             'EMPTY'),
    tech_risk:     pick(raw.tech_risk,     ['LOW', 'MEDIUM', 'HIGH', 'EMPTY'],                 'EMPTY'),
    mgmt_risk:     pick(raw.mgmt_risk,     ['LOW', 'MEDIUM', 'HIGH', 'EMPTY'],                 'EMPTY'),
    // Metadata
    notes:      typeof raw.notes === 'string' ? raw.notes : '',
    dataSource: typeof raw.dataSource === 'string' ? raw.dataSource : '',
    priceAsOf:  typeof raw.priceAsOf === 'string' ? raw.priceAsOf : new Date().toISOString().split('T')[0],
    confidence: pick(raw.confidence, ['High', 'Medium', 'Low'] as const, 'Low'),
  };
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(ticker: string, type: StockType): string {
  const typeInstructions: Record<StockType, string> = {
    Growth: `- eps_value: TTM (trailing twelve months) EPS in the stock's native currency
- growth_rate: a reasonable PE multiple (e.g. 15 for a stable grower, 20–25 for a faster grower)
- expected_dividend: annual dividend per share (null if no dividend)
- dividend_return_rate: null
- bvps: null
- discount_factor: null`,
    Dividends: `- eps_value: TTM EPS (still useful context)
- growth_rate: null
- expected_dividend: annual dividend per share in native currency (sum of last 4 quarters)
- dividend_return_rate: target yield as decimal (e.g. 0.04 for 4%; use sector norms)
- bvps: null
- discount_factor: null`,
    Asset: `- eps_value: null
- growth_rate: null
- expected_dividend: null
- dividend_return_rate: null
- bvps: book value per share (most recent quarter)
- discount_factor: 0.8 (standard 80% discount)`,
  };

  return `You are a professional stock research analyst. Analyze the stock ${ticker} (type: ${type}).

Use web_search to look up:
1. Today's current market price for ${ticker}
2. The latest financial data needed for ${type} valuation:
${typeInstructions[type]}
3. Qualitative factors for the F.A.C.T.S framework

Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY a valid JSON object with exactly these fields:

{
  "name": "Full company name",
  "currentPrice": <number>,
  "currency": "USD",

  "eps_value": <number or null>,
  "growth_rate": <number or null>,
  "expected_dividend": <number or null>,
  "dividend_return_rate": <number or null>,
  "bvps": <number or null>,
  "discount_factor": <number or null>,

  "eps":          "YES" | "NO" | "EMPTY",
  "fcf":          "YES" | "NO" | "EMPTY",
  "roe":          "YES" | "NO" | "EMPTY",
  "int_cov":      "ABOVE_10" | "ABOVE_4" | "NO_DEBT" | "NO" | "EMPTY",
  "moat":         "TWO_MOATS" | "ONE_MOAT" | "NO" | "EMPTY",
  "net_margin":   "ABOVE_20" | "ABOVE_10" | "INCREASING" | "NO" | "EMPTY",
  "has_dividends":"YES" | "NO" | "EMPTY",
  "policy":       "YES" | "NO" | "EMPTY",
  "tech_risk":    "LOW" | "MEDIUM" | "HIGH" | "EMPTY",
  "mgmt_risk":    "LOW" | "MEDIUM" | "HIGH" | "EMPTY",

  "notes": "brief explanation of key data sources and valuation rationale",
  "dataSource": "e.g. FY2024 10-K / Q3 2024 10-Q",
  "priceAsOf": "YYYY-MM-DD",
  "confidence": "High" | "Medium" | "Low"
}

Rules:
- eps: YES if EPS has grown consistently over 3+ years
- fcf: YES if free cash flow is consistently positive
- roe: YES if ROE > 15% (evaluate true economic ROE, not distorted by buybacks)
- int_cov: NO_DEBT if D/E < 0.5; ABOVE_10 if coverage > 10x; ABOVE_4 if 4–10x; NO if < 4x
- moat: TWO_MOATS if brand + another advantage; ONE_MOAT if one clear advantage; NO otherwise
- net_margin: ABOVE_20 if >20%; ABOVE_10 if >10%; INCREASING if growing YoY; NO otherwise
- policy: YES if shareholder-friendly (buybacks, dividends, low dilution)
- tech_risk: LOW/MEDIUM/HIGH based on disruption risk
- mgmt_risk: LOW/MEDIUM/HIGH based on governance, stability
- confidence: High if data is within 3 months; Medium if 3–12 months; Low if >12 months or uncertain
- Only return JSON, no markdown, no extra text`;
}

// ── Main function ──────────────────────────────────────────────────────────────

export async function analyzeStock(ticker: string, type: StockType): Promise<StockAIPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(ticker.toUpperCase(), type);

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  const tools = [{ type: 'web_search_20260209', name: 'web_search' }] as Anthropic.Messages.ToolUnion[];

  // web_search is a server-side tool — the API handles searches internally.
  // We only need to handle pause_turn (server hit its sampling limit) by resuming.
  let response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    tools,
    messages,
  });

  const MAX_CONTINUATIONS = 5;
  let continuations = 0;
  while (response.stop_reason === 'pause_turn' && continuations < MAX_CONTINUATIONS) {
    messages.push({ role: 'assistant', content: response.content });
    response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      tools,
      messages,
    });
    continuations++;
  }

  // Extract JSON from the final text response
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    throw new Error('No text response from AI');
  }

  // Parse JSON (strip any accidental markdown fences)
  const jsonText = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${textBlock.text.slice(0, 200)}`);
  }

  return sanitizePayload(raw, ticker, type);
}
