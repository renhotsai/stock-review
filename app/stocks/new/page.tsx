import StockForm from '@/components/StockForm';

export default async function NewStockPage({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol } = await searchParams;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新增股票</h1>
        <p className="text-sm text-gray-500 mt-1">加入一支美股到追蹤清單</p>
      </div>
      <StockForm mode="create" initialData={{ symbol: symbol ?? '' }} />
    </div>
  );
}
