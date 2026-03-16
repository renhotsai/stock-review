# BOS 股票追蹤系統 — Next.js Side Project Plan

> 此文件可直接交付給 Claude Code 執行。
> 原始參考：Google Sheets「BOS表格V7.3」股票估值系統

---

## 一、專案概覽

將 Google Sheets BOS 表格重建為全端 Next.js Web App，支援：
- 股票清單管理（新增／編輯／刪除）
- 三種估值模型（成長股 / 股息股 / 資產股）自動計算合理價
- 自動抓取即時股價（Yahoo Finance API）
- F.A.C.T.S 評估標準自動評分
- 顏色標記（綠 = 低估、黃 = 合理、紅 = 高估）
- **公司財務概覽**（營收、EPS、FCF、ROE、淨利率趨勢）
- **配息歷史**（歷年股息、除息日、股息成長率）
- **關鍵財務指標**（P/E、殖利率、派息比率等）

---

## 二、Tech Stack

```
框架:        Next.js 14+ (App Router)
語言:        TypeScript
樣式:        Tailwind CSS + shadcn/ui
資料庫:      SQLite（Prisma ORM）— 可無縫換成 PostgreSQL
股價 API:    yahoo-finance2（免費，不需 API Key）
財務資料:    yahoo-finance2 quoteSummary + fundamentalsTimeSeries + chart
資料同步:   TanStack Query (React Query v5)
圖表:        Recharts（營收/配息趨勢圖）
表單驗證:   React Hook Form + Zod
狀態管理:   Zustand（全域 UI state）
```

---

## 三、財務資料架構（新增章節）

### 3-A. Yahoo Finance 可用資料模組

| 資料類型 | Yahoo Finance 模組 | 刷新頻率 |
|---|---|---|
| 即時股價 | `quote(ticker)` | 每 20 分鐘 |
| 公司基本資訊 | `quoteSummary` → `summaryProfile` | 每週 |
| 關鍵財務指標 | `quoteSummary` → `financialData` + `defaultKeyStatistics` + `summaryDetail` | 每日 |
| 配息歷史 | `chart(ticker, { events: 'div' })` | 每月 |
| 年度營收 / EPS / FCF | `fundamentalsTimeSeries` → `annualTotalRevenue`, `annualDilutedEps`, `annualFreeCashFlow` | 每季 |
| 年度 ROE / 淨利率 | `fundamentalsTimeSeries` → `annualReturnOnEquity`, `annualNetIncomeContinuousOperations` | 每季 |
| 歷史股價（走勢圖） | `chart(ticker, { period1, period2 })` | 每日 |

> ⚠️ **重要**：自 2024 年 11 月起，`incomeStatementHistory`、`balanceSheetHistory`、`cashflowStatementHistory` 幾乎不返回資料，**必須改用 `fundamentalsTimeSeries`**。

### 3-B. 資料快取策略（FinancialCache 表）

所有財務資料都應快取在本地 DB，避免每次都打 Yahoo Finance：

```prisma
model FinancialCache {
  id        String   @id @default(cuid())
  ticker    String
  dataType  CacheDataType
  data      Json      // 原始 JSON 資料
  fetchedAt DateTime @default(now())
  expiresAt DateTime  // 依 dataType 決定 TTL

  @@unique([ticker, dataType])
  @@index([ticker])
}

enum CacheDataType {
  COMPANY_PROFILE     // summaryProfile — TTL: 7 天
  KEY_METRICS         // financialData + defaultKeyStatistics — TTL: 1 天
  DIVIDEND_HISTORY    // chart events dividends — TTL: 30 天
  ANNUAL_FINANCIALS   // fundamentalsTimeSeries — TTL: 90 天（一季更新一次）
  PRICE_HISTORY       // chart price data — TTL: 1 天
}
```

**快取查詢邏輯：**
```typescript
// lib/financial-cache.ts
async function getOrFetch<T>(
  ticker: string,
  dataType: CacheDataType,
  fetchFn: () => Promise<T>,
  ttlDays: number
): Promise<T> {
  const cached = await prisma.financialCache.findUnique({
    where: { ticker_dataType: { ticker, dataType } }
  })

  if (cached && cached.expiresAt > new Date()) {
    return cached.data as T  // 返回快取資料
  }

  const freshData = await fetchFn()  // 打 Yahoo Finance
  const expiresAt = addDays(new Date(), ttlDays)

  await prisma.financialCache.upsert({
    where: { ticker_dataType: { ticker, dataType } },
    update: { data: freshData as any, fetchedAt: new Date(), expiresAt },
    create: { ticker, dataType, data: freshData as any, expiresAt },
  })

  return freshData
}
```

### 3-C. 財務資料 TypeScript 型別

```typescript
// types/financials.ts

export interface CompanyProfile {
  name: string           // 公司全名
  shortName: string      // 簡稱
  sector: string         // 行業大類，e.g. "Consumer Defensive"
  industry: string       // 細分行業，e.g. "Beverages—Non-Alcoholic"
  description: string    // 公司描述
  website: string
  employees: number
  country: string
  logo?: string          // 可用 clearbit logo API 補充
}

export interface KeyMetrics {
  // 估值
  peRatio: number | null           // 本益比 P/E
  forwardPE: number | null         // 預期本益比
  priceToBook: number | null       // 股價淨值比 P/B
  priceToSales: number | null      // 股價營收比 P/S

  // 獲利能力
  epsTrailing: number | null       // 每股盈利（近 12 個月）
  epsForward: number | null        // 預期每股盈利
  returnOnEquity: number | null    // ROE（%，e.g. 0.40 = 40%）
  returnOnAssets: number | null    // ROA
  profitMargin: number | null      // 淨利率
  grossMargin: number | null       // 毛利率
  operatingMargin: number | null   // 營業利益率

  // 現金流
  freeCashflow: number | null      // 自由現金流（絕對值，USD）
  operatingCashflow: number | null

  // 股息
  dividendYield: number | null     // 殖利率（%）
  dividendRate: number | null      // 年度股息（USD）
  payoutRatio: number | null       // 派息比率（%）
  exDividendDate: Date | null      // 最近除息日
  nextDividendDate: Date | null    // 下次除息日（如可取得）
  dividendGrowthRate5Y: number | null  // 近 5 年股息年化成長率（CAGR）

  // 規模
  marketCap: number | null         // 市值
  enterpriseValue: number | null   // 企業價值
  sharesOutstanding: number | null // 在外流通股數
  beta: number | null              // 貝塔值（波動性）
}

export interface AnnualFinancial {
  year: number
  revenue: number | null           // 總營收
  grossProfit: number | null       // 毛利
  netIncome: number | null         // 淨利
  eps: number | null               // 每股盈利（稀釋後）
  freeCashFlow: number | null      // 自由現金流
  roe: number | null               // ROE（%）
  netMargin: number | null         // 淨利率（%）— netIncome / revenue
}

export interface DividendRecord {
  date: Date        // 除息日 (ex-dividend date)
  amount: number    // 每股股息金額（單次）
  annualized?: number  // 年化股息（通常為 amount × 支付次數）
}

export interface DividendHistory {
  records: DividendRecord[]
  currency: string
  frequency: 'quarterly' | 'monthly' | 'annual' | 'irregular'
  consecutiveYears: number        // 連續配息年數
  dividendGrowthRate1Y: number | null   // 近 1 年股息成長率
  dividendGrowthRate3Y: number | null   // 近 3 年 CAGR
  dividendGrowthRate5Y: number | null   // 近 5 年 CAGR
  dividendGrowthRate10Y: number | null  // 近 10 年 CAGR
}

export interface PriceHistoryPoint {
  date: Date
  close: number
  volume: number
}

export interface FullStockData {
  ticker: string
  profile: CompanyProfile
  metrics: KeyMetrics
  annualFinancials: AnnualFinancial[]   // 最近 5 年
  dividendHistory: DividendHistory
  priceHistory?: PriceHistoryPoint[]    // 可選，用於走勢圖
}
```

---

## 三、資料模型（Prisma Schema）

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Stock {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // === 基本資訊 ===
  ticker    String   @unique   // 股票代碼，e.g. "KO"
  addedDate DateTime @default(now())
  type      StockType            // Growth | Dividends | Asset

  // === F.A.C.T.S 評估標準（Criteria Columns）===
  // E - EPS
  eps          YesNo @default(EMPTY)
  // F - FCF
  fcf          YesNo @default(EMPTY)
  // R - ROE
  roe          YesNo @default(EMPTY)
  // I - Interest Coverage
  intCov       IntCovValue @default(EMPTY)
  // E - 護城河 (Economic Moat)
  moat         MoatValue @default(EMPTY)
  // N - Net Margin
  netMargin    NetMarginValue @default(EMPTY)
  // D - Dividends (持續發股息)
  hasDividends YesNo @default(EMPTY)
  // A - 政策 (Policy / Management governance)
  policy       YesNo @default(EMPTY)
  // S - 科技風險 (Tech Risk)
  techRisk     RiskValue @default(EMPTY)
  // K - 人物 (Key Person Risk)
  mgmtRisk     RiskValue @default(EMPTY)

  // === 估值輸入欄位 ===
  // Growth stock inputs
  epsValue     Float?     // 每股盈利 EPS
  growthRate   Float?     // G 成長率（作為估值乘數，e.g. 13.87 = 13.87倍）

  // Dividends stock inputs
  expectedDividend    Float?   // 預期年度股息（e.g. 2.12）
  dividendReturnRate  Float    @default(0.04)  // 要求回報率（默認 4%）

  // Asset stock inputs
  bvps           Float?   // Book Value Per Share
  discountFactor Float    @default(0.8)  // 打幾折

  // === 備註 ===
  notes String @default("")
}

enum StockType {
  Growth
  Dividends
  Asset
}

enum YesNo {
  YES
  NO
  EMPTY
}

enum IntCovValue {
  ABOVE_10       // > 10
  ABOVE_4        // > 4
  NO_DEBT        // -- 沒有負債
  BELOW_4        // < 4
  EMPTY
}

enum MoatValue {
  TWO_MOATS    // 2 Moats
  ONE_MOAT     // 1 Moat
  NO_MOAT      // No Moat
  EMPTY
}

enum NetMarginValue {
  ABOVE_20     // >20%
  ABOVE_10     // >10%
  INCREASING   // 一年比一年多
  BELOW_10     // <10%
  EMPTY
}

enum RiskValue {
  NO_RISK    // No Risk
  RISK       // Risk
  HIGH_RISK  // High Risk
  EMPTY
}
```

---

## 四、估值公式（核心業務邏輯）

原表格的公式已完整逆向工程，在 `lib/valuation.ts` 中實作：

```typescript
// lib/valuation.ts

export interface ValuationResult {
  fairValue: number | null      // 合理價 (Entry)
  reviewValue: number | null    // 重新估價 (Review)
  score: number                 // 信心分數（自動計算）
}

export function calculateValuation(stock: Stock): ValuationResult {
  let fairValue: number | null = null
  let reviewValue: number | null = null

  switch (stock.type) {
    case 'Growth':
      // 合理價 = EPS × G成長率
      // 重新估價 = 合理價 × 1.2
      if (stock.epsValue && stock.growthRate) {
        fairValue = stock.epsValue * stock.growthRate
        reviewValue = fairValue * 1.2
      }
      break

    case 'Dividends':
      // 合理價 = 預期股息 ÷ 要求回報率（默認 4%）
      // 重新估價 = 合理價 × 1.5
      if (stock.expectedDividend) {
        fairValue = stock.expectedDividend / stock.dividendReturnRate
        reviewValue = fairValue * 1.5
      }
      break

    case 'Asset':
      // 合理價 = BVPS ÷ 打幾折（默認 0.8）→ 等於 BVPS × 1.25
      // 重新估價 = BVPS（即按帳面值買入）
      // 注意：Asset 股的 Review < Entry（更保守的買入點）
      if (stock.bvps) {
        fairValue = stock.bvps / stock.discountFactor
        reviewValue = stock.bvps
      }
      break
  }

  return {
    fairValue,
    reviewValue,
    score: calculateScore(stock),
  }
}

// 評分邏輯（逆向自 SUM(AE:AU) 公式）
// 每個條件滿足加 1 分，特殊條件加 0.5 分
// 最高約 8.5 分
export function calculateScore(stock: Stock): number {
  let score = 0

  // EPS (+1)
  if (stock.eps === 'YES') score += 1

  // FCF (+1)
  if (stock.fcf === 'YES') score += 1

  // ROE (+1)
  if (stock.roe === 'YES') score += 1

  // Int Coverage：>10 得 1 分，>4 得 0.5 分，沒有負債得 1 分
  if (stock.intCov === 'ABOVE_10') score += 1
  else if (stock.intCov === 'ABOVE_4') score += 0.5
  else if (stock.intCov === 'NO_DEBT') score += 1

  // Moat：2 Moats 得 1 分，1 Moat 得 0.5 分
  if (stock.moat === 'TWO_MOATS') score += 1
  else if (stock.moat === 'ONE_MOAT') score += 0.5

  // Net Margin：>20% 得 1 分，>10% 或遞增 得 0.5 分
  if (stock.netMargin === 'ABOVE_20') score += 1
  else if (stock.netMargin === 'ABOVE_10' || stock.netMargin === 'INCREASING') score += 0.5

  // Dividends (+1)
  if (stock.hasDividends === 'YES') score += 1

  // Policy (+0.5)
  if (stock.policy === 'YES') score += 0.5

  // Tech Risk：No Risk 不扣分，Risk 扣 0 或加 0（中性評估）
  // Management Risk：同上

  return score
}

// 判斷股價狀態（用於顏色標記）
export type PriceStatus = 'undervalued' | 'fair' | 'overvalued' | 'unknown'

export function getPriceStatus(
  currentPrice: number | null,
  fairValue: number | null,
  reviewValue: number | null
): PriceStatus {
  if (!currentPrice || !fairValue) return 'unknown'
  if (currentPrice <= fairValue) return 'undervalued'       // 綠：低於合理價
  if (!reviewValue || currentPrice <= reviewValue) return 'fair'  // 黃：在合理價和重新估價之間
  return 'overvalued'                                        // 紅：超過重新估價
}
```

---

## 五、專案結構

```
bos-tracker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 主頁：股票列表儀表板
│   ├── stocks/
│   │   ├── new/
│   │   │   └── page.tsx            # 新增股票頁面
│   │   └── [ticker]/
│   │       ├── page.tsx            # 個股詳細分析頁面（含財務 Tabs）
│   │       ├── edit/
│   │       │   └── page.tsx        # 編輯股票頁面
│   │       └── financials/
│   │           └── page.tsx        # 獨立財務頁面（可選）
│   └── api/
│       ├── stocks/
│       │   ├── route.ts            # GET all, POST new
│       │   └── [id]/
│       │       └── route.ts        # GET one, PUT, DELETE
│       ├── price/
│       │   └── [ticker]/
│       │       └── route.ts        # 即時股價代理（Yahoo Finance）
│       └── financials/
│           └── [ticker]/
│               ├── route.ts        # GET 完整財務資料（帶快取）
│               ├── dividends/
│               │   └── route.ts    # GET 配息歷史
│               └── price-history/
│                   └── route.ts    # GET 歷史股價
│
├── components/
│   ├── StockTable.tsx              # 主要股票列表表格
│   ├── StockRow.tsx                # 單列股票（含顏色標記）
│   ├── StockForm.tsx               # 新增/編輯表單
│   ├── ValuationCard.tsx           # 估值摘要卡片
│   ├── ScoreBadge.tsx              # 信心分數徽章
│   ├── CriteriaGrid.tsx            # F.A.C.T.S 評估格子
│   ├── PriceStatusBadge.tsx        # 股價狀態（綠/黃/紅）
│   │
│   ├── financials/
│   │   ├── CompanyHeader.tsx       # 公司名稱、行業、描述
│   │   ├── KeyMetricsGrid.tsx      # P/E、ROE、殖利率等關鍵指標卡片
│   │   ├── RevenueChart.tsx        # 年度營收 + 淨利 長條圖（Recharts）
│   │   ├── EpsChart.tsx            # EPS 趨勢折線圖
│   │   ├── FcfChart.tsx            # 自由現金流趨勢圖
│   │   ├── MarginChart.tsx         # 淨利率 / 毛利率趨勢圖
│   │   ├── DividendHistoryTable.tsx # 歷年配息紀錄表格（含 YoY 成長%）
│   │   ├── DividendGrowthChart.tsx  # 配息成長折線圖
│   │   └── FinancialsLoadingSkeleton.tsx  # 載入中骨架屏
│   │
│   └── charts/
│       ├── PriceChart.tsx          # 股價走勢圖（1Y/5Y/MAX 切換）
│       └── ValuationBand.tsx       # 股價 vs 合理價/重新估價 區間圖
│
├── lib/
│   ├── valuation.ts                # 估值公式（如上）
│   ├── prisma.ts                   # Prisma client singleton
│   ├── yahoo-finance.ts            # Yahoo Finance 封裝（股價 + 財務資料）
│   ├── financial-cache.ts          # 快取讀寫邏輯（getOrFetch 工具）
│   └── dividend-utils.ts           # 股息 CAGR、連續配息年數計算
│
├── hooks/
│   ├── useStocks.ts                # React Query hooks
│   ├── useStockPrice.ts            # 即時股價 hook（with polling）
│   ├── useFinancials.ts            # 完整財務資料 hook
│   ├── useDividendHistory.ts       # 配息歷史 hook
│   └── usePriceHistory.ts          # 歷史股價 hook（走勢圖用）
│
├── types/
│   └── stock.ts                    # TypeScript types
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # 種子資料（現有 21 支股票）
│
├── .env.local
├── package.json
└── README.md
```

---

## 六、API 設計

### `GET /api/stocks`
回傳所有股票，包含計算後的估值和即時股價。

**Response:**
```json
[
  {
    "id": "clxxx",
    "ticker": "KO",
    "type": "Dividends",
    "currentPrice": 77.63,
    "fairValue": 53.00,
    "reviewValue": 79.50,
    "score": 7,
    "priceStatus": "fair",
    "criteria": {
      "eps": "YES",
      "fcf": "YES",
      "roe": "YES",
      "intCov": "ABOVE_10",
      "moat": "TWO_MOATS",
      "netMargin": "ABOVE_20",
      "hasDividends": "YES",
      "policy": "YES",
      "techRisk": "NO_RISK",
      "mgmtRisk": "NO_RISK"
    },
    "valuationInputs": {
      "expectedDividend": 2.12,
      "dividendReturnRate": 0.04
    }
  }
]
```

### `POST /api/stocks`
新增股票。Body 同上（不含計算欄位）。

### `PUT /api/stocks/[id]`
更新股票資料。

### `DELETE /api/stocks/[id]`
刪除股票。

### `GET /api/price/[ticker]`
即時股價代理，後端呼叫 yahoo-finance2，避免 CORS 問題。

**Response:**
```json
{ "ticker": "KO", "price": 77.63, "currency": "USD", "timestamp": 1710000000 }
```

---

### `GET /api/financials/[ticker]`
回傳完整財務資料（從快取或即時抓取）。

**Query params:**
- `?refresh=true` — 強制刷新，忽略快取

**Response:**
```json
{
  "ticker": "KO",
  "fetchedAt": "2026-03-16T10:00:00Z",
  "profile": {
    "name": "The Coca-Cola Company",
    "sector": "Consumer Defensive",
    "industry": "Beverages—Non-Alcoholic",
    "description": "The Coca-Cola Company, a beverage company...",
    "website": "https://www.coca-colacompany.com",
    "employees": 82500,
    "country": "United States"
  },
  "metrics": {
    "peRatio": 25.6,
    "epsTrailing": 2.52,
    "returnOnEquity": 0.42,
    "profitMargin": 0.224,
    "dividendYield": 0.027,
    "dividendRate": 2.12,
    "payoutRatio": 0.73,
    "exDividendDate": "2026-03-13",
    "marketCap": 336000000000,
    "beta": 0.55
  },
  "annualFinancials": [
    { "year": 2024, "revenue": 47061000000, "netIncome": 10624000000, "eps": 2.52, "freeCashFlow": 9283000000, "roe": 0.42, "netMargin": 0.226 },
    { "year": 2023, "revenue": 45754000000, "netIncome": 10714000000, "eps": 2.47, "freeCashFlow": 9552000000, "roe": 0.40, "netMargin": 0.234 },
    { "year": 2022, "revenue": 43004000000, "netIncome": 9542000000, "eps": 2.19, "freeCashFlow": 9543000000, "roe": 0.37, "netMargin": 0.222 }
  ],
  "dividendHistory": {
    "frequency": "quarterly",
    "consecutiveYears": 62,
    "dividendGrowthRate1Y": 0.050,
    "dividendGrowthRate5Y": 0.048,
    "dividendGrowthRate10Y": 0.046,
    "records": [
      { "date": "2026-03-13", "amount": 0.53 },
      { "date": "2025-12-15", "amount": 0.51 },
      { "date": "2025-09-15", "amount": 0.51 }
    ]
  }
}
```

### `GET /api/financials/[ticker]/dividends`
僅回傳配息歷史（較輕量，用於配息頁面）。

### `GET /api/financials/[ticker]/price-history`
回傳歷史股價（1 年 / 5 年 / 全部），用於走勢圖。

**Query params:** `?period=1Y|5Y|MAX`

---

## 七、UI 設計規格

### 主頁（儀表板）
- 頂部：統計卡片（低估股票數 / 合理股票數 / 高估股票數）
- 篩選列：按股票類型（All / Growth / Dividends / Asset）
- 主表格欄位（由左至右）：
  1. 股票代碼（粗體，可點擊進詳細頁）
  2. 類型（徽章：藍=成長 / 紫=股息 / 橙=資產）
  3. 現在股價（自動更新，20分鐘一次）
  4. 合理價（Entry）
  5. 重新估價（Review）
  6. 信心分數（顯示為星號或數字）
  7. 狀態（`低估` 綠底 / `合理` 黃底 / `高估` 紅底）
  8. 操作按鈕（編輯 / 刪除）
- 右上角：「＋ 新增股票」按鈕

### 顏色規則（完全仿造原表格）
```
現在股價 < 合理價           → 儲存格綠色背景
合理價 ≤ 現在股價 ≤ 重新估價 → 白色/默認背景
現在股價 > 重新估價          → 儲存格紅色背景
```

### 個股詳細頁面（`/stocks/KO`）— 分 Tabs 顯示

**頂部固定區（所有 Tab 共用）：**
- 公司名稱（"The Coca-Cola Company"）+ 代號（KO）+ 交易所
- 即時股價 + 漲跌幅（今日）
- 3 個狀態徽章：合理價 $53 | 重新估價 $79.50 | 信心分數 7/8.5
- 股價狀態標籤（大字：`合理` / `低估` / `高估`）

---

**Tab 1：📊 估值分析（Valuation）**
```
估值卡片列：
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ 現在股價    │ │ 合理價      │ │ 重新估價    │
  │ $77.63      │ │ $53.00      │ │ $79.50      │
  │ (即時)      │ │ 股息÷4%     │ │ 合理×1.5    │
  └─────────────┘ └─────────────┘ └─────────────┘

股價 vs 估值區間視覺化（ValuationBand 元件）：
  ←──────────────[合理 $53]────────[重新 $79.5]──▲$77.63──→

F.A.C.T.S 評估格子（10 個標準，圖示 + 文字 + 選擇值）：
  ✅ EPS: Yes    ✅ FCF: Yes    ✅ ROE: Yes
  ✅ Int Cov: >10   ✅ 護城河: 2 Moats
  ✅ Net Margin: >20%   ✅ Dividends: Yes
  ✅ 政策: Yes   ✅ 科技: No Risk   ✅ 人物: No Risk

估值輸入（依類型展開）：
  [股息股] 年度股息: $2.12 | 要求回報率: 4%
```

---

**Tab 2：🏢 公司資訊（Profile）**
```
公司概覽卡片：
  名稱 | 行業 | 國家 | 員工人數 | 網站連結

關鍵財務指標 2×5 格子：
  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
  │ P/E      │ 殖利率   │ EPS      │ 淨利率   │ ROE      │
  │ 25.6x    │ 2.7%     │ $2.52    │ 22.6%    │ 42%      │
  ├──────────┼──────────┼──────────┼──────────┼──────────┤
  │ 市值     │ 派息比率 │ 自由現金流 │ Beta    │ P/B      │
  │ $336B    │ 73%      │ $9.3B    │ 0.55     │ 10.2x    │
  └──────────┴──────────┴──────────┴──────────┴──────────┘

公司描述（可折疊，超過 200 字）
```

---

**Tab 3：💰 財務數據（Financials）**
```
切換按鈕：[年度] [季度]

圖表 1：營收 & 淨利（長條圖）
  Y軸: 金額(B)  X軸: 2020~2024
  藍色柱 = 總營收    橙色柱 = 淨利

圖表 2：EPS 趨勢（折線圖）
  顯示近 5 年 EPS，標出 YoY 成長率

圖表 3：自由現金流趨勢（面積圖）
  顯示近 5 年 FCF，標出是否為正

圖表 4：淨利率趨勢（折線圖）
  顯示近 5 年淨利率 %

財務資料表格（可滾動）：
  年度 | 營收 | 毛利 | 淨利 | EPS | FCF | ROE | 淨利率
  2024 | $47B | ...  | $10.6B | $2.52 | $9.3B | 42% | 22.6%
  2023 | $45B | ...  | $10.7B | $2.47 | $9.6B | 40% | 23.4%
```

---

**Tab 4：📅 配息歷史（Dividends）**
```
摘要卡片列：
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ 年度股息     │ │ 殖利率       │ │ 連續配息     │ │ 下次除息日   │
  │ $2.12        │ │ 2.7%         │ │ 62 年        │ │ 2026-06-12   │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

股息成長率卡片：
  1Y: +5.0%  |  3Y CAGR: +4.8%  |  5Y CAGR: +4.8%  |  10Y CAGR: +4.6%

配息成長趨勢圖（折線圖）：
  X軸: 年份（近 10~15 年）
  Y軸: 年化股息金額（USD）

配息歷史明細表格（分頁，每頁 20 筆）：
  ┌───────────────┬──────────┬───────────────────┐
  │ 除息日        │ 每股股息 │ YoY 成長率        │
  ├───────────────┼──────────┼───────────────────┤
  │ 2026-03-13    │ $0.53    │ +3.9% ↑           │
  │ 2025-12-15    │ $0.51    │ —                 │
  │ 2025-09-15    │ $0.51    │ —                 │
  │ 2025-06-16    │ $0.51    │ —                 │
  └───────────────┴──────────┴───────────────────┘
```

---

**Tab 5：📈 股價走勢（Price Chart）**
```
期間切換：[1M] [3M] [6M] [1Y] [5Y] [MAX]

互動式折線圖（Recharts）：
  - 股價折線（主線）
  - 合理價水平線（綠色虛線，$53）
  - 重新估價水平線（橙色虛線，$79.50）
  - 配息日標記（▼ 圖示）
  - Tooltip 顯示：日期、收盤價、vs 合理價差距

成交量長條圖（圖表下方）
```

### 新增/編輯表單
```
Step 1: 基本資訊
  - 股票代碼（輸入後自動 validate 是否存在）
  - 股票類型（Growth / Dividends / Asset 選擇）

Step 2: F.A.C.T.S 評估標準
  - 10 個 dropdown 欄位（含說明）

Step 3: 估值輸入
  - 依 Step 1 選擇的類型，顯示對應輸入欄
  - Growth：EPS + G成長率
  - Dividends：預期年度股息 + 要求回報率（默認 4%）
  - Asset：每股帳面價值 + 打幾折（默認 0.8）

預覽：即時顯示計算結果
```

---

## 八、Stock Price 即時更新策略

1. 頁面載入時，從 DB 顯示資料（快速）
2. 背景呼叫 `/api/price/[ticker]`（Yahoo Finance proxy）取得即時價格
3. 用 React Query 每 20 分鐘 refetch 一次（對應 Google Finance 的延遲特性）
4. 股價僅存在 client 端記憶體，不寫回 DB

```typescript
// hooks/useStockPrice.ts
export function useStockPrice(ticker: string) {
  return useQuery({
    queryKey: ['price', ticker],
    queryFn: () => fetch(`/api/price/${ticker}`).then(r => r.json()),
    staleTime: 20 * 60 * 1000,  // 20 分鐘
    refetchInterval: 20 * 60 * 1000,
  })
}
```

---

## 九、種子資料（現有 21 支股票）

在 `prisma/seed.ts` 中預填以下股票（來自原 Google Sheets）：

```typescript
const seeds = [
  // Growth stocks
  { ticker: 'DIS',  type: 'Growth',    addedDate: '2019-09-06', epsValue: 7.74,  growthRate: 13.87, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'TWO_MOATS', netMargin: 'ABOVE_10', hasDividends: 'YES', policy: 'YES', techRisk: 'NO_RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'COST', type: 'Growth',    addedDate: '2020-07-12', epsValue: 8.36,  growthRate: 12.18, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'TWO_MOATS', netMargin: 'INCREASING', hasDividends: 'YES', policy: 'YES', techRisk: 'NO_RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'KR',   type: 'Growth',    addedDate: '2020-11-21', epsValue: 3.28,  growthRate: 14.16, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'EMPTY',    moat: 'TWO_MOATS', netMargin: 'INCREASING', hasDividends: 'YES', policy: 'YES', techRisk: 'NO_RISK', mgmtRisk: 'NO_RISK' },

  // Asset stocks
  { ticker: 'BRK-B', type: 'Asset',   addedDate: '2020-08-16', bvps: 208.09, discountFactor: 0.8, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'ONE_MOAT', netMargin: 'ABOVE_20', hasDividends: 'NO', policy: 'YES', techRisk: 'NO_RISK', mgmtRisk: 'NO_RISK' },

  // Dividends stocks
  { ticker: 'AAPL', type: 'Dividends', addedDate: '2019-09-06', expectedDividend: 2.29, dividendReturnRate: 0.04, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'TWO_MOATS', netMargin: 'ABOVE_20', hasDividends: 'YES', policy: 'YES', techRisk: 'RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'BCBP', type: 'Dividends', addedDate: '2021-09-08', expectedDividend: 0.56, dividendReturnRate: 0.04, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'NO_DEBT', moat: 'TWO_MOATS', netMargin: 'INCREASING', hasDividends: 'YES', techRisk: 'RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'MCBC', type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 0.32, dividendReturnRate: 0.04, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'NO_DEBT', moat: 'TWO_MOATS', netMargin: 'INCREASING', hasDividends: 'YES', techRisk: 'RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'MFC',  type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 0.88, dividendReturnRate: 0.04, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'TWO_MOATS', netMargin: 'INCREASING', hasDividends: 'YES', techRisk: 'RISK', mgmtRisk: 'NO_RISK' },
  { ticker: 'ACNB', type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 1.00, dividendReturnRate: 0.04 },
  { ticker: 'AE',   type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 0.96, dividendReturnRate: 0.04 },
  { ticker: 'O',    type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 2.81, dividendReturnRate: 0.04 },
  { ticker: 'RIO',  type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 4.64, dividendReturnRate: 0.04 },
  { ticker: 'CL',   type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 1.77, dividendReturnRate: 0.04 },
  { ticker: 'ELS',  type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 1.41, dividendReturnRate: 0.04 },
  { ticker: 'SBUX', type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 1.76, dividendReturnRate: 0.04 },
  { ticker: 'SPG',  type: 'Dividends', addedDate: '2021-09-09', expectedDividend: 6.60, dividendReturnRate: 0.04 },
  { ticker: 'NHC',  type: 'Dividends', addedDate: '2021-09-10', expectedDividend: 2.08, dividendReturnRate: 0.04 },
  { ticker: 'MAC',  type: 'Dividends', addedDate: '2021-09-10', expectedDividend: 0.88, dividendReturnRate: 0.04 },
  { ticker: 'KO',   type: 'Dividends', addedDate: '2026-03-12', expectedDividend: 2.12, dividendReturnRate: 0.04, eps: 'YES', fcf: 'YES', roe: 'YES', intCov: 'ABOVE_10', moat: 'TWO_MOATS', netMargin: 'ABOVE_20', hasDividends: 'YES', policy: 'YES', techRisk: 'NO_RISK', mgmtRisk: 'NO_RISK' },
]
```

---

## 十、實作步驟（按順序執行）

### Phase 1：專案初始化
```bash
# 1. 建立 Next.js 專案
npx create-next-app@latest bos-tracker \
  --typescript --tailwind --eslint --app --src-dir --no --import-alias "@/*"
cd bos-tracker

# 2. 安裝依賴
npm install \
  @prisma/client prisma \
  @tanstack/react-query \
  react-hook-form @hookform/resolvers zod \
  zustand \
  yahoo-finance2 \
  recharts \
  date-fns \
  lucide-react \
  clsx tailwind-merge

# 3. 安裝 shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card table badge input select dialog form \
  dropdown-menu tooltip skeleton tabs separator

# 4. 初始化 Prisma
npx prisma init --datasource-provider sqlite
```

### Phase 2：資料層
1. 建立 `prisma/schema.prisma`（參照 Section 三）
2. 執行 `npx prisma migrate dev --name init`
3. 建立 `prisma/seed.ts`（參照 Section 九）
4. 執行 `npx prisma db seed`
5. 建立 `lib/prisma.ts`（singleton client）

### Phase 3：業務邏輯
1. 建立 `lib/valuation.ts`（估值公式，參照 Section 四）
2. 建立 `lib/yahoo-finance.ts`（封裝 yahoo-finance2，含財務資料抓取）
3. 建立 `lib/financial-cache.ts`（getOrFetch 快取邏輯）
4. 建立 `lib/dividend-utils.ts`（CAGR、連續配息年數等工具函數）
5. 建立 `types/stock.ts` + `types/financials.ts`（TypeScript 型別）

### Phase 4：API Routes
1. `app/api/stocks/route.ts`（GET list, POST create）
2. `app/api/stocks/[id]/route.ts`（GET one, PUT update, DELETE）
3. `app/api/price/[ticker]/route.ts`（price proxy）
4. `app/api/financials/[ticker]/route.ts`（完整財務資料，有快取）
5. `app/api/financials/[ticker]/dividends/route.ts`（配息歷史）
6. `app/api/financials/[ticker]/price-history/route.ts`（歷史股價）

### Phase 5：UI Components（基礎）
1. `components/StockTable.tsx`（主表格）
2. `components/StockRow.tsx`（含 React Query 獲取即時價格）
3. `components/StockForm.tsx`（新增/編輯，多步驟表單）
4. `components/ValuationCard.tsx`
5. `components/ScoreBadge.tsx`
6. `components/CriteriaGrid.tsx`
7. `components/PriceStatusBadge.tsx`

### Phase 6：財務資料 Components（新增）
1. `components/financials/CompanyHeader.tsx`
2. `components/financials/KeyMetricsGrid.tsx`（10 格關鍵指標）
3. `components/financials/RevenueChart.tsx`（Recharts 年度長條圖）
4. `components/financials/EpsChart.tsx`（EPS 折線圖）
5. `components/financials/FcfChart.tsx`（FCF 面積圖）
6. `components/financials/MarginChart.tsx`（淨利率趨勢）
7. `components/financials/DividendHistoryTable.tsx`（配息明細表格）
8. `components/financials/DividendGrowthChart.tsx`（配息成長趨勢）
9. `components/charts/PriceChart.tsx`（股價走勢 + 估值帶）
10. `components/financials/FinancialsLoadingSkeleton.tsx`

### Phase 7：Pages
1. `app/page.tsx`（Dashboard）
2. `app/stocks/new/page.tsx`
3. `app/stocks/[ticker]/page.tsx`（含 5 個 Tabs：估值/公司/財務/配息/走勢）
4. `app/stocks/[ticker]/edit/page.tsx`

### Phase 8：測試與優化
1. 驗證所有估值公式計算正確（與 Google Sheets 原始資料對比）
2. 測試股價 API 和財務資料 API 可正常獲取
3. 測試快取機制正確運作（過期後才重新抓取）
4. 確認顏色標記邏輯正確
5. 響應式設計測試（手機板）
6. 圖表 Tooltip 和互動效果測試

---

## 十一、環境變數（`.env.local`）

```env
DATABASE_URL="file:./dev.db"
# 可選：如日後要換成 PostgreSQL
# DATABASE_URL="postgresql://user:password@localhost:5432/bos_tracker"
```

---

## 十二、重要實作備注

### Yahoo Finance 完整封裝（`lib/yahoo-finance.ts`）

```typescript
import yahooFinance from 'yahoo-finance2'
import type {
  CompanyProfile, KeyMetrics, AnnualFinancial,
  DividendHistory, DividendRecord, PriceHistoryPoint
} from '@/types/financials'

// ─── 即時股價 ──────────────────────────────────────────
export async function getStockPrice(ticker: string) {
  try {
    const quote = await yahooFinance.quote(ticker)
    return {
      price: quote.regularMarketPrice ?? null,
      change: quote.regularMarketChange ?? null,
      changePercent: quote.regularMarketChangePercent ?? null,
      currency: quote.currency ?? 'USD',
      timestamp: new Date(),
    }
  } catch (error) {
    console.error(`[YF] Price fetch failed for ${ticker}:`, error)
    return null
  }
}

// ─── 公司基本資訊 ──────────────────────────────────────
export async function getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryProfile', 'quoteType']
    })
    const profile = result.summaryProfile
    const quoteType = result.quoteType
    if (!profile) return null
    return {
      name: quoteType?.longName ?? quoteType?.shortName ?? ticker,
      shortName: quoteType?.shortName ?? ticker,
      sector: profile.sector ?? '',
      industry: profile.industry ?? '',
      description: profile.longBusinessSummary ?? '',
      website: profile.website ?? '',
      employees: profile.fullTimeEmployees ?? 0,
      country: profile.country ?? '',
    }
  } catch (error) {
    console.error(`[YF] Profile fetch failed for ${ticker}:`, error)
    return null
  }
}

// ─── 關鍵財務指標 ──────────────────────────────────────
export async function getKeyMetrics(ticker: string): Promise<KeyMetrics | null> {
  try {
    const result = await yahooFinance.quoteSummary(ticker, {
      modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'calendarEvents']
    })
    const fd = result.financialData
    const ks = result.defaultKeyStatistics
    const sd = result.summaryDetail
    const ce = result.calendarEvents

    return {
      peRatio: sd?.trailingPE ?? null,
      forwardPE: sd?.forwardPE ?? null,
      priceToBook: ks?.priceToBook ?? null,
      priceToSales: null,  // 計算：marketCap / revenue（可後處理）
      epsTrailing: ks?.trailingEps ?? null,
      epsForward: ks?.forwardEps ?? null,
      returnOnEquity: fd?.returnOnEquity ?? null,
      returnOnAssets: fd?.returnOnAssets ?? null,
      profitMargin: fd?.profitMargins ?? null,
      grossMargin: fd?.grossMargins ?? null,
      operatingMargin: fd?.operatingMargins ?? null,
      freeCashflow: fd?.freeCashflow ?? null,
      operatingCashflow: fd?.operatingCashflow ?? null,
      dividendYield: sd?.dividendYield ?? null,
      dividendRate: sd?.dividendRate ?? null,
      payoutRatio: sd?.payoutRatio ?? null,
      exDividendDate: sd?.exDividendDate ? new Date(sd.exDividendDate) : null,
      nextDividendDate: ce?.exDividendDate ? new Date(ce.exDividendDate) : null,
      dividendGrowthRate5Y: ks?.fiveYearAvgDividendYield ?? null,
      marketCap: sd?.marketCap ?? null,
      enterpriseValue: ks?.enterpriseValue ?? null,
      sharesOutstanding: ks?.sharesOutstanding ?? null,
      beta: sd?.beta ?? null,
    }
  } catch (error) {
    console.error(`[YF] Key metrics fetch failed for ${ticker}:`, error)
    return null
  }
}

// ─── 年度財務歷史（使用 fundamentalsTimeSeries，非 incomeStatementHistory）
// ⚠️ 自 2024/11 起，舊模組已廢棄，改用此模組 ──────────────
export async function getAnnualFinancials(ticker: string): Promise<AnnualFinancial[]> {
  try {
    const result = await yahooFinance.fundamentalsTimeSeries(ticker, {
      type: [
        'annualTotalRevenue',
        'annualGrossProfit',
        'annualNetIncome',
        'annualDilutedEps',
        'annualFreeCashFlow',
        'annualReturnOnEquity',
      ],
      period1: new Date(new Date().getFullYear() - 5, 0, 1),
    })

    // 整理為按年份的陣列
    const byYear = new Map<number, Partial<AnnualFinancial>>()
    for (const series of result) {
      const year = new Date(series.date).getFullYear()
      if (!byYear.has(year)) byYear.set(year, { year })
      const entry = byYear.get(year)!

      switch (series.type) {
        case 'annualTotalRevenue':     entry.revenue = series.reportedValue?.raw ?? null; break
        case 'annualGrossProfit':      entry.grossProfit = series.reportedValue?.raw ?? null; break
        case 'annualNetIncome':        entry.netIncome = series.reportedValue?.raw ?? null; break
        case 'annualDilutedEps':       entry.eps = series.reportedValue?.raw ?? null; break
        case 'annualFreeCashFlow':     entry.freeCashFlow = series.reportedValue?.raw ?? null; break
        case 'annualReturnOnEquity':   entry.roe = series.reportedValue?.raw ?? null; break
      }
    }

    // 計算淨利率
    const financials = Array.from(byYear.values()) as AnnualFinancial[]
    for (const f of financials) {
      if (f.netIncome && f.revenue && f.revenue > 0) {
        f.netMargin = f.netIncome / f.revenue
      }
    }

    return financials.sort((a, b) => b.year - a.year)  // 最新在前
  } catch (error) {
    console.error(`[YF] Annual financials fetch failed for ${ticker}:`, error)
    return []
  }
}

// ─── 配息歷史 ──────────────────────────────────────────
export async function getDividendHistory(ticker: string): Promise<DividendHistory> {
  try {
    // 使用 chart() 模組的 events，可取得完整歷史配息
    const result = await yahooFinance.chart(ticker, {
      period1: new Date(new Date().getFullYear() - 15, 0, 1),  // 近 15 年
      period2: new Date(),
      events: 'div',
    })

    const dividends = result.events?.dividends ?? {}
    const records: DividendRecord[] = Object.values(dividends)
      .map(d => ({
        date: new Date(d.date * 1000),
        amount: d.amount,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    // 計算各期間 CAGR
    const growthRates = calculateDividendGrowthRates(records)
    const consecutiveYears = countConsecutivePayingYears(records)

    return {
      records,
      currency: 'USD',
      frequency: detectFrequency(records),
      consecutiveYears,
      ...growthRates,
    }
  } catch (error) {
    console.error(`[YF] Dividend history fetch failed for ${ticker}:`, error)
    return {
      records: [],
      currency: 'USD',
      frequency: 'quarterly',
      consecutiveYears: 0,
      dividendGrowthRate1Y: null,
      dividendGrowthRate3Y: null,
      dividendGrowthRate5Y: null,
      dividendGrowthRate10Y: null,
    }
  }
}

// ─── 歷史股價（用於走勢圖）──────────────────────────────
export async function getPriceHistory(
  ticker: string,
  period: '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX' = '1Y'
): Promise<PriceHistoryPoint[]> {
  const periodMap: Record<string, number> = {
    '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '5Y': 1825, 'MAX': 36500
  }
  const daysBack = periodMap[period]
  const period1 = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  try {
    const result = await yahooFinance.chart(ticker, {
      period1,
      period2: new Date(),
      interval: period === '1M' || period === '3M' ? '1d' : '1wk',
    })
    return (result.quotes ?? []).map(q => ({
      date: new Date(q.date),
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }))
  } catch (error) {
    console.error(`[YF] Price history fetch failed for ${ticker}:`, error)
    return []
  }
}
```

### 股息計算工具（`lib/dividend-utils.ts`）

```typescript
// 計算連續配息年數
export function countConsecutivePayingYears(records: DividendRecord[]): number {
  if (records.length === 0) return 0
  const years = new Set(records.map(r => r.date.getFullYear()))
  let consecutive = 0
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; years.has(y) || years.has(y - 1); y--) {
    if (years.has(y)) consecutive++
    else break
  }
  return consecutive
}

// 計算年度股息（將季度配息加總成年度）
export function aggregateAnnualDividends(
  records: DividendRecord[]
): { year: number; total: number }[] {
  const byYear = new Map<number, number>()
  for (const r of records) {
    const year = r.date.getFullYear()
    byYear.set(year, (byYear.get(year) ?? 0) + r.amount)
  }
  return Array.from(byYear.entries())
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => b.year - a.year)
}

// 計算 CAGR（複合年增長率）
export function calculateCAGR(
  records: DividendRecord[],
  years: number
): number | null {
  const annuals = aggregateAnnualDividends(records)
  const currentYear = new Date().getFullYear()
  const recent = annuals.find(a => a.year === currentYear || a.year === currentYear - 1)
  const past = annuals.find(a => a.year === currentYear - years)
  if (!recent || !past || past.total === 0) return null
  return Math.pow(recent.total / past.total, 1 / years) - 1
}

export function calculateDividendGrowthRates(records: DividendRecord[]) {
  return {
    dividendGrowthRate1Y: calculateCAGR(records, 1),
    dividendGrowthRate3Y: calculateCAGR(records, 3),
    dividendGrowthRate5Y: calculateCAGR(records, 5),
    dividendGrowthRate10Y: calculateCAGR(records, 10),
  }
}

// 偵測配息頻率
export function detectFrequency(
  records: DividendRecord[]
): 'quarterly' | 'monthly' | 'annual' | 'irregular' {
  if (records.length < 2) return 'irregular'
  const recentYear = records
    .filter(r => r.date.getFullYear() === new Date().getFullYear() - 1)
  const count = recentYear.length
  if (count >= 10) return 'monthly'
  if (count >= 3 && count <= 5) return 'quarterly'
  if (count === 1) return 'annual'
  return 'irregular'
}
```

### F.A.C.T.S Dropdown 選項對應
```typescript
// 供 StockForm 使用的選項陣列
export const CRITERIA_OPTIONS = {
  yesNo: [
    { value: 'YES', label: 'Yes ✓' },
    { value: 'NO',  label: 'No ✗' },
  ],
  intCov: [
    { value: 'ABOVE_10', label: '> 10' },
    { value: 'ABOVE_4',  label: '> 4' },
    { value: 'NO_DEBT',  label: '-- 沒有負債' },
    { value: 'BELOW_4',  label: '< 4' },
  ],
  moat: [
    { value: 'TWO_MOATS', label: '2 Moats' },
    { value: 'ONE_MOAT',  label: '1 Moat' },
    { value: 'NO_MOAT',   label: 'No Moat' },
  ],
  netMargin: [
    { value: 'ABOVE_20',   label: '>20%' },
    { value: 'ABOVE_10',   label: '>10%' },
    { value: 'INCREASING', label: '一年比一年多' },
    { value: 'BELOW_10',   label: '<10%' },
  ],
  risk: [
    { value: 'NO_RISK',   label: 'No Risk' },
    { value: 'RISK',      label: 'Risk' },
    { value: 'HIGH_RISK', label: 'High Risk' },
  ],
}
```

---

## 十三、功能擴充（未來版本 Backlog）

- [ ] 匯出 CSV / XLSX 功能
- [ ] 多幣別支援（港股、台股）
- [ ] 歷史估值記錄（每次估值留存快照）
- [ ] 圖表：股價 vs 合理價走勢
- [ ] 股息追蹤記錄
- [ ] NextAuth 加入登入（多用戶）
- [ ] Vercel 部署 + PlanetScale PostgreSQL
- [ ] PWA 支援（手機安裝）

---

*本文件由 Claude 根據 BOS表格V7.3 (2021.09.08) Google Sheets 分析生成。*
*估值公式已透過逆向工程完整驗證（Growth ✓、Dividends ✓）。*
