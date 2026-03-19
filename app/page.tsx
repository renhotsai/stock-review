import { sql, setupDatabase } from '@/lib/db';
import type { Stock } from '@/lib/db';
import StockTable from '@/components/StockTable';
import { calculateValuation } from '@/lib/valuation';
import Link from 'next/link';
import StockSearch from '@/components/StockSearch';

export const revalidate = 0;

async function getStocks(): Promise<Stock[]> {
  try {
    return (await sql`SELECT * FROM stocks ORDER BY symbol ASC`) as Stock[];
  } catch {
    // Table likely doesn't exist yet — initialize schema and retry
    try {
      await setupDatabase();
      return (await sql`SELECT * FROM stocks ORDER BY symbol ASC`) as Stock[];
    } catch (err) {
      console.error('DB init failed:', err);
      return [];
    }
  }
}

export default async function DashboardPage() {
  const stocks = await getStocks();

  // Pre-calculate scores from DB fields (no live price needed for counts)
  const stocksWithValuation = stocks.map((s) => {
    const { score } = calculateValuation(s);
    return { ...s, score };
  });

  const highScoreCount = stocksWithValuation.filter((s) => s.score >= 7.5).length;
  const totalCount = stocks.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">股票追蹤清單</h1>
          <p className="text-sm text-gray-500 mt-1">
            追蹤 {totalCount} 支美股 · 股價每 20 分鐘更新
          </p>
        </div>
        <StockSearch />
        <div className="flex gap-3 flex-wrap">
          {highScoreCount > 0 && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              {highScoreCount} 支高信心分數 (≥ 7.5)
            </div>
          )}
          <Link
            href="/stocks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 新增股票
          </Link>
        </div>
      </div>

      <StockTable stocks={stocksWithValuation} />

      <p className="text-xs text-gray-400 mt-4 text-right">
        股價資料來自 Yahoo Finance，可能有 15 分鐘延遲。股價每 20 分鐘由瀏覽器自動更新。
      </p>
    </div>
  );
}
