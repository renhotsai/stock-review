'use client';

import Link from 'next/link';
import StockTable from '@/components/StockTable';
import StockSearch from '@/components/StockSearch';
import type { Stock } from '@/lib/db';
import { useTranslation } from '@/contexts/LanguageContext';

interface DashboardViewProps {
  stocks: Stock[];
  error?: string;
  highScoreCount: number;
  totalCount: number;
}

export default function DashboardView({ stocks, error, highScoreCount, totalCount }: DashboardViewProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('dashboard.subtitle', { count: totalCount })}
          </p>
        </div>
        <StockSearch />
        <div className="flex gap-3 flex-wrap">
          {highScoreCount > 0 && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              {t('dashboard.highScore', { count: highScoreCount })}
            </div>
          )}
          <Link
            href="/stocks/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t('dashboard.addStock')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600 font-medium">{t('dashboard.errorTitle')}</p>
          <p className="text-sm text-red-500 mt-0.5">{error}</p>
        </div>
      )}

      {/* Color legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-gray-400 mr-1">{t('dashboard.priceRangeLabel')}</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {t('dashboard.buyZone')}
          <span className="text-green-600 font-normal">{t('dashboard.buyZoneDesc')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
          {t('dashboard.fairZone')}
          <span className="text-yellow-700 font-normal">{t('dashboard.fairZoneDesc')}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
          {t('dashboard.overvalued')}
          <span className="text-red-600 font-normal">{t('dashboard.overvaluedDesc')}</span>
        </span>
      </div>

      <StockTable stocks={stocks} />

      <p className="text-xs text-gray-400 mt-4 text-right">
        {t('dashboard.disclaimer')}
      </p>
    </div>
  );
}
