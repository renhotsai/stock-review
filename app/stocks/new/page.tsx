import StockForm from '@/components/StockForm';
import NewStockHeader from '@/components/NewStockHeader';

export default async function NewStockPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol } = await searchParams;
  return (
    <div>
      <NewStockHeader />
      <StockForm mode="create" initialData={{ symbol: symbol ?? '' }} />
    </div>
  );
}
