import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { getStockLimit } from '@/lib/subscription-config';
import StockForm from '@/components/StockForm';
import NewStockHeader from '@/components/NewStockHeader';

export default async function NewStockPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol } = await searchParams;

  const session = await auth();
  const userId = Number(session?.user?.id);

  // Server-side limit check before rendering the form
  try {
    const [countRow] = await sql`SELECT COUNT(*) AS count FROM stocks WHERE user_id = ${userId}`;
    const [userRow] = await sql`SELECT subscription_status FROM users WHERE id = ${userId}`;
    const limit = getStockLimit(userRow?.subscription_status as string);
    if (Number(countRow?.count ?? 0) >= limit) {
      redirect('/pricing');
    }
  } catch {
    // If DB check fails, allow the page to load (API will enforce limit on submit)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <NewStockHeader />
      <StockForm mode="create" initialData={{ symbol: symbol ?? '' }} />
    </div>
  );
}
