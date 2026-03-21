'use client';

import type { DividendRecord } from '@/types/financials';
import {
  aggregateAnnualDividends,
  calculateCAGR,
  countConsecutivePayingYears,
  detectFrequency,
} from '@/lib/dividend-utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface DividendHistoryTableProps {
  records: DividendRecord[];
  ticker: string;
}

export default function DividendHistoryTable({ records, ticker }: DividendHistoryTableProps) {
  const { t } = useTranslation();

  const freqKey: Record<string, string> = {
    monthly: 'financials.dividendHistory.monthly',
    quarterly: 'financials.dividendHistory.quarterly',
    'semi-annual': 'financials.dividendHistory.semiAnnual',
    annual: 'financials.dividendHistory.annual',
    irregular: 'financials.dividendHistory.irregular',
  };

  if (records.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-3">{t('financials.dividendHistory.title')}</h3>
        <p className="text-sm text-gray-400">{t('financials.dividendHistory.noRecords', { ticker })}</p>
      </div>
    );
  }

  const annuals = aggregateAnnualDividends(records);
  const consecutiveYears = countConsecutivePayingYears(records);
  const cagr3 = calculateCAGR(records, 3);
  const cagr5 = calculateCAGR(records, 5);
  const frequency = detectFrequency(records);
  const sortedAnnuals = [...annuals].sort((a, b) => b.year - a.year).slice(0, 8);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">{t('financials.dividendHistory.title')}</h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{t('financials.dividendHistory.consecutiveYears')}</p>
          <p className="text-xl font-bold text-blue-700">{consecutiveYears}年</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{t('financials.dividendHistory.frequency')}</p>
          <p className="text-lg font-bold text-gray-800">{t(freqKey[frequency] ?? 'financials.dividendHistory.irregular')}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{t('financials.dividendHistory.cagr3')}</p>
          <p className="text-xl font-bold text-green-700">
            {cagr3 != null ? `${(cagr3 * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{t('financials.dividendHistory.cagr5')}</p>
          <p className="text-xl font-bold text-green-700">
            {cagr5 != null ? `${(cagr5 * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {/* Annual table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2 text-left font-semibold text-gray-600">{t('financials.dividendHistory.year')}</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">{t('financials.dividendHistory.annualDividend')}</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">{t('financials.dividendHistory.count')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedAnnuals.map((row) => (
              <tr key={row.year} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700 font-medium">{row.year}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-900">${row.total.toFixed(4)}</td>
                <td className="px-4 py-2 text-right text-gray-500">{row.count}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
