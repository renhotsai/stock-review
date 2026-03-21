'use client';

import { useTranslation } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
      title={locale === 'zh' ? 'Switch to English' : '切換至中文'}
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  );
}
