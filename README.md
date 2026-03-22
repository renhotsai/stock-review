# BOS Stock Tracker

A full-stack Next.js web app that rebuilds the BOS Google Sheets stock valuation system. Track your portfolio, calculate fair values across three valuation models, and analyze fundamentals — all in one place.

## Features

- **Stock Management** — Add, edit, and delete stocks in your watchlist
- **Three Valuation Models** — Automatic fair value calculation for Growth, Dividend, and Asset stocks
- **Real-Time Prices** — Live stock prices via Yahoo Finance
- **F.A.C.T.S. Scoring** — Automated evaluation against fundamental criteria
- **Color-Coded Status** — Green (undervalued), yellow (fair value), red (overvalued)
- **Financial Overview** — Revenue, EPS, FCF, ROE, and net margin trends with charts
- **Dividend History** — Annual dividends, ex-dates, and dividend growth rate
- **Key Metrics** — P/E ratio, yield, payout ratio, and more
- **AI Analyst** — AI-powered stock evaluation via OpenAI
- **Authentication** — Secure login with NextAuth v5
- **Multi-language** — i18n support (English / Chinese)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Neon (PostgreSQL serverless) |
| Auth | NextAuth v5 + `@auth/neon-adapter` |
| Price Data | Yahoo Finance v8 chart API |
| Fundamentals | Financial Modeling Prep (FMP) API |
| Data Fetching | TanStack Query (React Query v5) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| AI | OpenAI API |
| Email | Resend |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- [Vercel CLI](https://vercel.com/docs/cli) (for environment variable pull)
- A [Neon](https://neon.tech) database
- A [Financial Modeling Prep](https://financialmodelingprep.com) API key
- An [OpenAI](https://platform.openai.com) API key

### Setup

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/renhotsai/stock-review.git
cd stock-review
npm run setup
```

`npm run setup` pulls environment variables from Vercel and installs packages. Alternatively, copy `.env.example` to `.env.development.local` and fill in values manually, then run `npm install`.

2. Initialize the database:

```bash
npm run db:setup
npm run db:seed   # optional: seed with sample data
```

3. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret |
| `FMP_API_KEY` | Financial Modeling Prep API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `RESEND_API_KEY` | Resend email API key |

## Data Sources

| Data Type | Source |
|---|---|
| Real-time price | Yahoo Finance v8 chart |
| Price history | Yahoo Finance v8 chart |
| Dividend history | Yahoo Finance v8 chart (events) |
| Company profile | FMP `/v3/profile/{symbol}` |
| Key metrics (P/E, ROE, margins) | FMP `/v3/key-metrics-ttm` + `/v3/ratios-ttm` |
| Annual financials (income, cash flow) | FMP `/v3/income-statement` + `/v3/cash-flow-statement` |

> **Note:** Yahoo Finance v7/v10 fundamental endpoints require browser session cookies since late 2024 and are not usable server-side. FMP is used for all fundamental data.

## Project Structure

```
app/
  api/
    ai-evaluate/    # AI stock analysis endpoint
    auth/           # NextAuth handlers
    cron/           # Scheduled price refresh
    financials/     # Fundamentals from FMP
    price/          # Real-time price from Yahoo Finance
    search/         # Stock ticker search
    stocks/         # CRUD for tracked stocks
  auth/             # Login/signup pages
  lookup/           # Stock lookup page
  stocks/
    new/            # Add new stock
    [id]/           # Stock detail & edit
  page.tsx          # Dashboard
components/         # Shared UI components
lib/
  ai-analyst.ts     # OpenAI integration
  db.ts             # Neon database client
  financial-cache.ts # Cache layer for financial data
  valuation.ts      # Valuation model logic
  yahoo-finance.ts  # Yahoo Finance helpers
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Initialize database schema |
| `npm run db:seed` | Seed sample data |

## License

ISC
