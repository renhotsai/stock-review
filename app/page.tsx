import { sql, setupDatabase } from '@/lib/db';
import type { Stock } from '@/lib/db';
import { calculateValuation } from '@/lib/valuation';
import { auth } from '@/auth';
import DashboardView from '@/components/DashboardView';
import { getStockLimit } from '@/lib/subscription-config';

export const revalidate = 0;

async function getStocks(userId: number): Promise<{ stocks: Stock[]; error?: string }> {
  try {
    const stocks = (await sql`SELECT * FROM stocks WHERE user_id = ${userId} ORDER BY symbol ASC`) as Stock[];
    return { stocks };
  } catch {
    // Table likely doesn't exist yet — initialize schema and retry
    try {
      await setupDatabase();
      const stocks = (await sql`SELECT * FROM stocks WHERE user_id = ${userId} ORDER BY symbol ASC`) as Stock[];
      return { stocks };
    } catch (err) {
      console.error('DB init failed:', err);
      return { stocks: [], error: '資料庫連線失敗，請稍後再試或聯絡管理員。' };
    }
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const { stocks, error } = await getStocks(userId);

  // Get subscription status
  let subscriptionStatus = 'free';
  let periodEnd: string | null = null;
  try {
    const [user] = await sql`SELECT subscription_status, subscription_period_end FROM users WHERE id = ${userId}`;
    subscriptionStatus = (user?.subscription_status as string) ?? 'free';
    periodEnd = (user?.subscription_period_end as string) ?? null;
  } catch {
    // ignore — default to free
  }

  const stockLimit = getStockLimit(subscriptionStatus);

  // Pre-calculate scores from DB fields (no live price needed for counts)
  const stocksWithValuation = stocks.map((s) => {
    const { score } = calculateValuation(s);
    return { ...s, score };
  });

  const highScoreCount = stocksWithValuation.filter((s) => s.score >= 7.5).length;
  const totalCount = stocks.length;

  return (
    <DashboardView
      stocks={stocksWithValuation}
      error={error}
      highScoreCount={highScoreCount}
      totalCount={totalCount}
      stockLimit={stockLimit}
      subscriptionStatus={subscriptionStatus}
      periodEnd={periodEnd}
    />
  );
}
