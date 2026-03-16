'use client';

import type { PriceStatus } from '@/lib/valuation';

const statusConfig = {
  undervalued: { label: '買入區間', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  fair: { label: '合理區間', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  overvalued: { label: '高估', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  unknown: { label: '—', bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-300' },
};

interface PriceStatusBadgeProps {
  status: PriceStatus;
}

export default function PriceStatusBadge({ status }: PriceStatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
