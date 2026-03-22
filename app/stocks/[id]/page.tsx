import { sql } from '@/lib/db';
import type { Stock } from '@/lib/db';
import { notFound } from 'next/navigation';
import StockDetailClient from './StockDetailClient';
import StockDetailHeader from '@/components/StockDetailHeader';

export const revalidate = 0;

export default async function StockDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const [stock] = (await sql`SELECT * FROM stocks WHERE id = ${id}`) as Stock[];
  if (!stock) notFound();

  return (
    <div>
      <StockDetailHeader
        stockId={stock.id}
        symbol={stock.symbol}
        name={stock.name ?? null}
      />
      <StockDetailClient stock={stock} />
    </div>
  );
}
