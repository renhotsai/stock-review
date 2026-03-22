'use client';

import type { PriceStatus } from '@/lib/valuation';
import { useTranslation } from '@/contexts/LanguageContext';

const statusStyles = {
  undervalued: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  fair: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  overvalued: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  unknown: { bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-300' },
};

interface PriceStatusBadgeProps {
  status: PriceStatus;
}

export default function PriceStatusBadge({ status }: PriceStatusBadgeProps) {
  const { t } = useTranslation();
  const cfg = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {t(`priceStatus.${status}`)}
    </span>
  );
}
