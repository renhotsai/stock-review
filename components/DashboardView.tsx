'use client';

import Link from 'next/link';
import StockTable from '@/components/StockTable';
import StockSearch from '@/components/StockSearch';
import UpgradePrompt from '@/components/UpgradePrompt';
import type { Stock } from '@/lib/db';
import { useTranslation } from '@/contexts/LanguageContext';

interface DashboardViewProps {
  stocks: Stock[];
  error?: string;
  highScoreCount: number;
  totalCount: number;
  stockLimit: number;
  subscriptionStatus: string;
  periodEnd?: string | null;
}

export default function DashboardView({ stocks, error, highScoreCount, totalCount, stockLimit, subscriptionStatus, periodEnd }: DashboardViewProps) {
  const { t } = useTranslation();
  const atLimit = totalCount >= stockLimit;
  const isPro = subscriptionStatus === 'active' || subscriptionStatus === 'canceling';
  const isCanceling = subscriptionStatus === 'canceling';

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
        <div className="flex gap-3 flex-wrap items-center">
          {/* Stock count badge */}
          <span className={`text-sm px-3 py-1.5 rounded-lg font-medium ${atLimit ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
            {t('pricing.stockCount', { count: totalCount, limit: stockLimit })}
            {isPro && <span className="ml-1 text-xs text-blue-600">Pro</span>}
          </span>

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

      {isCanceling && periodEnd && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-amber-700 text-sm">
          {t('dashboard.subscriptionExpiring', { date: new Date(periodEnd).toLocaleDateString('zh-TW') })}
          <Link href="/pricing" className="ml-2 underline font-medium">{t('pricing.reactivate')}</Link>
        </div>
      )}

      {atLimit && !isPro && <UpgradePrompt limit={stockLimit} />}

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
