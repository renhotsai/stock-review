'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';

interface StockDetailHeaderProps {
  stockId: number;
  symbol: string;
  name: string | null;
}

export default function StockDetailHeader({ stockId, symbol, name }: StockDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-blue-600">{t('stockDetail.home')}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{symbol}</span>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{symbol}</h1>
          {name && <p className="text-gray-500 text-sm mt-0.5">{name}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/stocks/${stockId}/edit`}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('stockDetail.edit')}
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            {t('stockDetail.back')}
          </Link>
        </div>
      </div>
    </>
  );
}
