import { sql } from '@/lib/db';
import type { Stock } from '@/lib/db';
import StockForm from '@/components/StockForm';
import { notFound } from 'next/navigation';
import EditStockHeader from '@/components/EditStockHeader';

export default async function EditStockPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const [stock] = (await sql`SELECT * FROM stocks WHERE id = ${id}`) as Stock[];
  if (!stock) notFound();

  const initialData = {
    id: stock.id,
    symbol: stock.symbol,
    name: stock.name ?? '',
    type: stock.type ?? 'Dividends',
    added_date: stock.added_date ?? '',
    // F.A.C.T.S
    eps: stock.eps ?? 'EMPTY',
    fcf: stock.fcf ?? 'EMPTY',
    roe: stock.roe ?? 'EMPTY',
    int_cov: stock.int_cov ?? 'EMPTY',
    moat: stock.moat ?? 'EMPTY',
    net_margin: stock.net_margin ?? 'EMPTY',
    has_dividends: stock.has_dividends ?? 'EMPTY',
    policy: stock.policy ?? 'EMPTY',
    tech_risk: stock.tech_risk ?? 'EMPTY',
    mgmt_risk: stock.mgmt_risk ?? 'EMPTY',
    // Valuation
    eps_value: stock.eps_value != null ? String(stock.eps_value) : '',
    growth_rate: stock.growth_rate != null ? String(stock.growth_rate) : '',
    expected_dividend: stock.expected_dividend != null ? String(stock.expected_dividend) : '',
    dividend_return_rate: stock.dividend_return_rate != null ? String(stock.dividend_return_rate) : '0.04',
    bvps: stock.bvps != null ? String(stock.bvps) : '',
    discount_factor: stock.discount_factor != null ? String(stock.discount_factor) : '0.8',
    notes: stock.notes ?? '',
  };

  return (
    <div>
      <EditStockHeader symbol={stock.symbol} />
      <StockForm mode="edit" initialData={initialData} />
    </div>
  );
}
