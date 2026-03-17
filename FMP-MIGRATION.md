# FMP Migration Plan — BOS Stock Tracker

## 背景

Yahoo Finance v7/v10 API 自 2024 年起要求瀏覽器 session cookie (`A3`) + crumb，
伺服器端無法取得該 cookie，導致所有基本面資料 (PE、ROE、margins 等) 回傳 401。
**解決方案：改用 Financial Modeling Prep (FMP) 作為基本面資料來源。**

---

## 架構總覽

| 資料類型 | 新來源 | 舊來源 | 狀態 |
|---|---|---|---|
| 公司 profile | FMP `/v3/profile/{symbol}` | Yahoo v7 quote | ✅ 已替換 |
| Key metrics (PE/ROE/margins…) | FMP `/v3/key-metrics-ttm/{symbol}` + `/v3/ratios-ttm/{symbol}` | Yahoo v7 quote | ✅ 已替換 |
| 年度財報 (income/cashflow) | FMP `/v3/income-statement` + `/v3/cash-flow-statement` | Yahoo v10 quoteSummary | ✅ 已替換 |
| 即時股價 | Yahoo Finance v8 chart | Yahoo v8 chart | ✅ 不變 (無需 auth) |
| 股價歷史 | Yahoo Finance v8 chart | Yahoo v8 chart | ✅ 不變 |
| 股息歷史 | Yahoo Finance v8 chart | Yahoo v8 chart | ✅ 不變 |

---

## FMP API 端點規格

### Base URL
```
https://financialmodelingprep.com/api
```

### 認證
所有端點加上 `?apikey=FMP_API_KEY` 或 `&apikey=FMP_API_KEY`。
環境變數名稱：`FMP_API_KEY`（`.env.local` 和 Vercel Environment Variables）。

---

### 1. Company Profile
```
GET /v3/profile/{symbol}?apikey=KEY
```

**回傳結構** (array，取第 [0])：
```json
{
  "symbol": "KO",
  "companyName": "The Coca-Cola Company",
  "description": "...",
  "sector": "Consumer Defensive",
  "industry": "Beverages—Non-Alcoholic",
  "fullTimeEmployees": "79000",   ← string! 需 parseInt()
  "website": "https://www.coca-colacompany.com",
  "country": "US",
  "exchange": "NEW YORK STOCK EXCHANGE, INC.",
  "exchangeShortName": "NYSE",
  "currency": "USD",
  "mktCap": 269000000000,
  "image": "https://financialmodelingprep.com/image-stock/KO.png",  ← logo 直接用
  "beta": 0.584,
  "volAvg": 15000000,
  "range": "54.15-70.16",   ← "52wkLow-52wkHigh" string，需 split('-')
  "lastDiv": 1.94,
  "price": 62.5
}
```

**欄位映射 → `CompanyProfile`**：
| FMP 欄位 | App 欄位 | 備注 |
|---|---|---|
| `companyName` | `name` | |
| `description` | `description` | |
| `sector` | `sector` | |
| `industry` | `industry` | |
| `fullTimeEmployees` | `employees` | string → parseInt |
| `website` | `website` | |
| `country` | `country` | |
| `exchangeShortName` | `exchange` | |
| `currency` | `currency` | |
| `mktCap` | `marketCap` | |
| `image` | `logo` | FMP 直接提供，不用 Clearbit |

---

### 2. Key Metrics TTM
```
GET /v3/key-metrics-ttm/{symbol}?apikey=KEY
```

**回傳結構** (array，取第 [0])：
```json
{
  "peRatioTTM": 22.5,
  "pbRatioTTM": -40.7,
  "priceToSalesRatioTTM": 6.8,
  "enterpriseValueOverEBITDATTM": 20.4,
  "debtToEquityTTM": -23.8,
  "currentRatioTTM": 1.07,
  "roeTTM": -4.8,
  "dividendYieldTTM": 0.031,          ← decimal (0.031 = 3.1%)
  "dividendPerShareTTM": 1.94,        ← annual $ per share
  "payoutRatioTTM": 0.77,
  "bookValuePerShareTTM": -0.39,
  "netIncomePerShareTTM": 1.88,       ← diluted EPS TTM
  "freeCashFlowPerShareTTM": 1.97
}
```

**欄位映射 → `KeyMetrics`**：
| FMP 欄位 | App 欄位 |
|---|---|
| `peRatioTTM` | `peRatio` |
| `pbRatioTTM` | `pbRatio` |
| `priceToSalesRatioTTM` | `psRatio` |
| `enterpriseValueOverEBITDATTM` | `evToEbitda` |
| `debtToEquityTTM` | `debtToEquity` |
| `currentRatioTTM` | `currentRatio` |
| `roeTTM` | `roe` (fallback，優先用 ratios-ttm) |
| `dividendYieldTTM` | `dividendYield` |
| `dividendPerShareTTM` | `dividendRate` |
| `payoutRatioTTM` | `payoutRatio` |
| `bookValuePerShareTTM` | `bookValue` |
| `netIncomePerShareTTM` | `eps` |

---

### 3. Ratios TTM
```
GET /v3/ratios-ttm/{symbol}?apikey=KEY
```

**回傳結構** (array，取第 [0])：
```json
{
  "grossProfitMarginTTM": 0.60,
  "operatingProfitMarginTTM": 0.27,
  "netProfitMarginTTM": 0.22,
  "returnOnAssetsTTM": 0.10,
  "returnOnEquityTTM": -4.8
}
```

**欄位映射 → `KeyMetrics`**：
| FMP 欄位 | App 欄位 |
|---|---|
| `grossProfitMarginTTM` | `grossMargin` |
| `operatingProfitMarginTTM` | `operatingMargin` |
| `netProfitMarginTTM` | `netMargin` |
| `returnOnAssetsTTM` | `roa` |
| `returnOnEquityTTM` | `roe` (優先，覆蓋 key-metrics-ttm) |

**Profile 欄位 → `KeyMetrics`**：
| FMP 欄位 | App 欄位 | 備注 |
|---|---|---|
| `beta` | `beta` | |
| `volAvg` | `averageVolume` | |
| `range` | `fiftyTwoWeekHigh` / `fiftyTwoWeekLow` | 解析 "54.15-70.16" |

---

### 4. Income Statement (Annual)
```
GET /v3/income-statement/{symbol}?period=annual&limit=4&apikey=KEY
```

**回傳結構** (array，每個元素一個年度)：
```json
[
  {
    "date": "2023-12-31",
    "calendarYear": "2023",
    "period": "FY",
    "revenue": 45754000000,
    "grossProfit": 26828000000,
    "operatingIncome": 11311000000,
    "netIncome": 10714000000,
    "epsDiluted": 2.47,
    "grossProfitRatio": 0.5864,       ← 已計算好，直接用
    "operatingIncomeRatio": 0.2472,   ← 已計算好
    "netIncomeRatio": 0.2342          ← 已計算好
  },
  ...
]
```

**注意**：這個端點回傳的是 **完整 array**，不是單一物件。
程式用 `fmpFetchList<FmpIncomeStatement>()` 取得全部。

**欄位映射 → `AnnualFinancial`**：
| FMP 欄位 | App 欄位 |
|---|---|
| `calendarYear` | `year` (parseInt) |
| `revenue` | `revenue` |
| `grossProfit` | `grossProfit` |
| `operatingIncome` | `operatingIncome` |
| `netIncome` | `netIncome` |
| `epsDiluted` | `eps` |
| `grossProfitRatio` | `grossMargin` |
| `operatingIncomeRatio` | `operatingMargin` |
| `netIncomeRatio` | `netMargin` |

---

### 5. Cash Flow Statement (Annual)
```
GET /v3/cash-flow-statement/{symbol}?period=annual&limit=4&apikey=KEY
```

**回傳結構** (array)：
```json
[
  {
    "date": "2023-12-31",
    "calendarYear": "2023",
    "operatingCashFlow": 11599000000,
    "capitalExpenditure": -2054000000,
    "freeCashFlow": 9545000000    ← FMP 已計算好：operatingCF + capex
  },
  ...
]
```

**欄位映射 → `AnnualFinancial`**：
| FMP 欄位 | App 欄位 |
|---|---|
| `calendarYear` | 用於 join income statement |
| `freeCashFlow` | `freeCashFlow` |

---

## 程式實作細節

### 函式對應關係

```
getCompanyProfile(ticker)
  └─ fmpFetch<FmpProfile>("/v3/profile/{ticker}?")

getKeyMetrics(ticker)
  ├─ fmpFetch<FmpProfile>("/v3/profile/{ticker}?")          ← beta, volAvg, range
  ├─ fmpFetch<FmpKeyMetricsTTM>("/v3/key-metrics-ttm/{ticker}?")
  └─ fmpFetch<FmpRatiosTTM>("/v3/ratios-ttm/{ticker}?")

getAnnualFinancials(ticker)
  ├─ fmpFetchList<FmpIncomeStatement>("/v3/income-statement/{ticker}?period=annual&limit=4&")
  └─ fmpFetchList<FmpCashFlowStatement>("/v3/cash-flow-statement/{ticker}?period=annual&limit=4&")

getStockPrice / getPriceHistory / getDividendHistory
  └─ yfChart() ← Yahoo Finance v8，不需要修改
```

### Helper 函式

```typescript
// 單一物件端點 (profile, key-metrics-ttm, ratios-ttm)
fmpFetch<T>(endpoint: string): Promise<T | null>
  → fetch → 回傳 array[0]

// 列表端點 (income-statement, cash-flow-statement)
fmpFetchList<T>(endpoint: string): Promise<T[]>
  → fetch → 回傳完整 array

// 數值轉換
n(val: unknown): number | null
  → 處理 string/number/null，回傳有限數值或 null
```

### URL 格式注意

FMP 端點在 path 結尾帶 `?`，apikey 用 `&` 接：
```
/v3/profile/KO?              → 加上 &apikey=KEY
/v3/key-metrics-ttm/KO?      → 加上 &apikey=KEY
/v3/income-statement/KO?period=annual&limit=4&  → 加上 apikey=KEY
```

---

## 環境變數設定

### `.env.local` (本地開發)
```
FMP_API_KEY=yR5o2aGrI4d7HZFkV3UyPU8gTOzV9Ysl
```

### Vercel (生產)
Vercel Dashboard → Project → Settings → Environment Variables：
```
Name:  FMP_API_KEY
Value: yR5o2aGrI4d7HZFkV3UyPU8gTOzV9Ysl
Environments: Production, Preview, Development
```

---

## 限制與注意事項

| 項目 | 說明 |
|---|---|
| 免費方案限制 | 250 requests/day。每支股票每次完整載入消耗 ~5 次請求 |
| 快取策略 | `financial-cache.ts` 的 `getOrFetch` 快取 1 天，正常使用遠低於上限 |
| `revenueGrowth` | 目前設為 `null`（需額外呼叫 `/v3/financial-growth`，省請求數） |
| `freeCashflow` in KeyMetrics | 目前設為 `null`（TTM 總額需另外計算，年度 FCF 已在 AnnualFinancials） |
| 52wk range 解析 | FMP 回傳 `"54.15-70.16"` string，用 regex `/^([\d.]+)-([\d.]+)$/` 解析 |
| `fullTimeEmployees` | FMP 是 string（有時含逗號如 "79,000"），需 `parseInt(str.replace(/,/g, ''))` |

---

## 部署 Checklist

- [ ] `lib/yahoo-finance.ts` 已改為 FMP 實作
- [ ] `lib/financial-cache.ts` 已加上 `isValid` validator（防止快取壞資料）
- [ ] `app/api/financials/[ticker]/route.ts` 已加上 `isValid` validator
- [ ] `.env.local` 有 `FMP_API_KEY`
- [ ] Vercel Environment Variables 有 `FMP_API_KEY`
- [ ] 移除 `.git/index.lock` 和 `.git/HEAD.lock`（在 Mac terminal 執行）
- [ ] `git add` + `git commit` + `git push`
- [ ] 清除 Neon DB 舊的壞 cache（`DELETE FROM financial_cache WHERE data_type = 'full_financials'`）
