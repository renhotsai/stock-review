'use client';

import type { CompanyProfile, KeyMetrics } from '@/types/financials';
import { useTranslation } from '@/contexts/LanguageContext';

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtLarge(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

interface CompanyHeaderProps {
  profile: CompanyProfile | null;
  metrics: KeyMetrics | null;
  currentPrice: number | null;
}

export default function CompanyHeader({ profile, metrics, currentPrice }: CompanyHeaderProps) {
  const { t } = useTranslation();

  if (!profile) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-gray-400">Company profile unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
          {profile.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt={profile.name}
              className="w-full h-full object-contain p-1"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-sm text-gray-500">
                {profile.ticker} · {profile.exchange} · {profile.currency}
              </p>
            </div>
            <div className="text-right">
              {currentPrice != null && (
                <p className="text-2xl font-bold text-blue-700">${fmt(currentPrice)}</p>
              )}
              <p className="text-xs text-gray-500">
                52w: ${fmt(metrics?.fiftyTwoWeekLow)} – ${fmt(metrics?.fiftyTwoWeekHigh)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {profile.sector && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{profile.sector}</span>
            )}
            {profile.industry && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{profile.industry}</span>
            )}
            {profile.country && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{profile.country}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">{t('financials.companyHeader.marketCap')}</p>
          <p className="font-semibold text-gray-900">{fmtLarge(profile.marketCap)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('financials.companyHeader.pe')}</p>
          <p className="font-semibold text-gray-900">{fmt(metrics?.peRatio, 1)}x</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('financials.companyHeader.beta')}</p>
          <p className="font-semibold text-gray-900">{fmt(metrics?.beta, 2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('financials.companyHeader.employees')}</p>
          <p className="font-semibold text-gray-900">
            {profile.employees ? profile.employees.toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {profile.description && (
        <p className="mt-4 text-sm text-gray-600 line-clamp-3">{profile.description}</p>
      )}

      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
        >
          {profile.website}
        </a>
      )}
    </div>
  );
}
