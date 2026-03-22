'use client';

import { useTranslation } from '@/contexts/LanguageContext';

interface EditStockHeaderProps {
  symbol: string;
}

export default function EditStockHeader({ symbol }: EditStockHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('editPage.title', { symbol })}</h1>
      <p className="text-sm text-gray-500 mt-1">{t('editPage.subtitle')}</p>
    </div>
  );
}
