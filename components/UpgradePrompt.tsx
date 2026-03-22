'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import Link from 'next/link';

interface UpgradePromptProps {
  limit: number;
}

export default function UpgradePrompt({ limit }: UpgradePromptProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-medium text-amber-800">
          {t('pricing.upgradePromptTitle')}
        </p>
        <p className="text-sm text-amber-700 mt-0.5">
          {t('pricing.upgradePromptDesc', { limit })}
        </p>
      </div>
      <Link
        href="/pricing"
        className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shrink-0"
      >
        {t('pricing.upgradeNow')}
      </Link>
    </div>
  );
}
