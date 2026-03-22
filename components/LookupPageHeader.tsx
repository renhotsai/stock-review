'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/LanguageContext';

interface LookupPageHeaderProps {
  ticker: string;
}

export default function LookupPageHeader({ ticker }: LookupPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between mb-6">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          {t('lookupPage.home')}
        </Link>
        <span>/</span>
        <span>{t('lookupPage.lookup')}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{ticker}</span>
      </nav>
      <Link
        href={`/stocks/new?symbol=${ticker}`}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {t('lookupPage.addStock')}
      </Link>
    </div>
  );
}
