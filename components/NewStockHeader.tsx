'use client';

import { useTranslation } from '@/contexts/LanguageContext';

export default function NewStockHeader() {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('newStockPage.title')}</h1>
      <p className="text-sm text-gray-500 mt-1">{t('newStockPage.subtitle')}</p>
    </div>
  );
}
