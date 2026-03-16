'use client';

import { useState } from 'react';
import type { Stock } from '@/lib/db';
import { useStockPrice } from '@/hooks/useStockPrice';
import { useFinancials } from '@/hooks/useFinancials';
import { useDividendHistory } from '@/hooks/useDividendHistory';
import { calculateValuation } from '@/lib/valuation';
import ValuationCard from '@/components/ValuationCard';
import CriteriaGrid from '@/components/CriteriaGrid';
import CompanyHeader from '@/components/financials/CompanyHeader';
import KeyMetricsGrid from '@/components/financials/KeyMetricsGrid';
import RevenueChart from '@/components/financials/RevenueChart';
import EpsChart from '@/components/financials/EpsChart';
import FcfChart from '@/components/financials/FcfChart';
import MarginChart from '@/components/financials/MarginChart';
import DividendHistoryTable from '@/components/financials/DividendHistoryTable';
import DividendGrowthChart from '@/components/financials/DividendGrowthChart';
import FinancialsLoadingSkeleton from '@/components/financials/FinancialsLoadingSkeleton';
import PriceChart from '@/components/charts/PriceChart';

type Tab = 'valuation' | 'profile' | 'financials' | 'dividends' | 'price';

const TABS: { key: Tab; label: string }[] = [
  { key: 'valuation', label: '估值' },
  { key: 'profile', label: '公司資料' },
  { key: 'financials', label: '財務報表' },
  { key: 'dividends', label: '股息歷史' },
  { key: 'price', label: '價格走勢' },
];

interface StockDetailClientProps {
  stock: Stock;
}

export default function StockDetailClient({ stock }: StockDetailClientProps) {
  const [tab, setTab] = useState<Tab>('valuation');

  const { data: priceData, isLoading: priceLoading } = useStockPrice(stock.symbol);
  const { data: financials, isLoading: finLoading } = useFinancials(
    stock.symbol,
    tab === 'profile' || tab === 'financials'
  );
  const { data: dividends, isLoading: divLoading } = useDividendHistory(
    stock.symbol,
    tab === 'dividends'
  );

  const currentPrice = priceData?.price ?? null;
  const { fairValue, reviewValue } = calculateValuation(stock);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Valuation Tab ── */}
      {tab === 'valuation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Live price header */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">現在股價</p>
                {priceLoading ? (
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-700">
                    {currentPrice != null ? `$${currentPrice.toFixed(2)}` : '—'}
                  </p>
                )}
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>每 20 分鐘自動更新</p>
                <p>{new Date().toLocaleDateString('zh-TW')}</p>
              </div>
            </div>
            <ValuationCard stock={stock} currentPrice={currentPrice} />
          </div>
          <CriteriaGrid stock={stock} />
        </div>
      )}

      {/* ── Profile Tab ── */}
      {tab === 'profile' && (
        <div className="space-y-6">
          {finLoading ? (
            <FinancialsLoadingSkeleton />
          ) : (
            <>
              <CompanyHeader
                profile={financials?.profile ?? null}
                metrics={financials?.metrics ?? null}
                currentPrice={currentPrice}
              />
              <KeyMetricsGrid metrics={financials?.metrics ?? null} />
            </>
          )}
        </div>
      )}

      {/* ── Financials Tab ── */}
      {tab === 'financials' && (
        <div className="space-y-6">
          {finLoading ? (
            <FinancialsLoadingSkeleton />
          ) : financials && financials.annuals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueChart annuals={financials.annuals} />
              <EpsChart annuals={financials.annuals} />
              <FcfChart annuals={financials.annuals} />
              <MarginChart annuals={financials.annuals} />
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-gray-400 text-sm">財務數據無法取得</p>
            </div>
          )}
        </div>
      )}

      {/* ── Dividends Tab ── */}
      {tab === 'dividends' && (
        <div className="space-y-6">
          {divLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-100 rounded-xl" />
              <div className="h-48 bg-gray-100 rounded-xl" />
            </div>
          ) : (
            <>
              <DividendHistoryTable records={dividends ?? []} ticker={stock.symbol} />
              {dividends && dividends.length > 0 && (
                <DividendGrowthChart records={dividends} />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Price Chart Tab ── */}
      {tab === 'price' && (
        <div>
          <PriceChart
            ticker={stock.symbol}
            fairValue={fairValue}
            reviewValue={reviewValue}
          />
        </div>
      )}
    </div>
  );
}
