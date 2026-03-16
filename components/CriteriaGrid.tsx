'use client';

import type { Stock } from '@/lib/db';

interface CriterionItem {
  key: keyof Stock;
  label: string;
  options: { value: string; label: string; positive?: boolean; negative?: boolean }[];
}

const CRITERIA: CriterionItem[] = [
  {
    key: 'eps',
    label: 'EPS 穩定增長',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'YES', label: '是', positive: true },
      { value: 'NO', label: '否', negative: true },
    ],
  },
  {
    key: 'fcf',
    label: '自由現金流 (FCF)',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'YES', label: '正值', positive: true },
      { value: 'NO', label: '負值', negative: true },
    ],
  },
  {
    key: 'roe',
    label: 'ROE > 15%',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'YES', label: '是', positive: true },
      { value: 'NO', label: '否', negative: true },
    ],
  },
  {
    key: 'int_cov',
    label: '利息覆蓋率',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'ABOVE_10', label: '> 10x', positive: true },
      { value: 'ABOVE_4', label: '> 4x' },
      { value: 'NO_DEBT', label: '無負債', positive: true },
      { value: 'NO', label: '不足', negative: true },
    ],
  },
  {
    key: 'moat',
    label: '護城河',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'TWO_MOATS', label: '兩項護城河', positive: true },
      { value: 'ONE_MOAT', label: '一項護城河' },
      { value: 'NO', label: '無護城河', negative: true },
    ],
  },
  {
    key: 'net_margin',
    label: '淨利潤率',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'ABOVE_20', label: '> 20%', positive: true },
      { value: 'ABOVE_10', label: '> 10%' },
      { value: 'INCREASING', label: '持續增長' },
      { value: 'NO', label: '不達標', negative: true },
    ],
  },
  {
    key: 'has_dividends',
    label: '派發股息',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'YES', label: '是', positive: true },
      { value: 'NO', label: '否', negative: true },
    ],
  },
  {
    key: 'policy',
    label: '股東友善政策',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'YES', label: '是', positive: true },
      { value: 'NO', label: '否', negative: true },
    ],
  },
  {
    key: 'tech_risk',
    label: '科技顛覆風險',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'LOW', label: '低', positive: true },
      { value: 'MEDIUM', label: '中' },
      { value: 'HIGH', label: '高', negative: true },
    ],
  },
  {
    key: 'mgmt_risk',
    label: '管理層風險',
    options: [
      { value: 'EMPTY', label: '未評估' },
      { value: 'LOW', label: '低', positive: true },
      { value: 'MEDIUM', label: '中' },
      { value: 'HIGH', label: '高', negative: true },
    ],
  },
];

interface CriteriaGridProps {
  stock: Stock;
}

export default function CriteriaGrid({ stock }: CriteriaGridProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">F.A.C.T.S 評估標準</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CRITERIA.map((criterion) => {
          const rawValue = stock[criterion.key] as string;
          const opt = criterion.options.find((o) => o.value === rawValue);
          const label = opt?.label ?? rawValue;
          const isPositive = opt?.positive;
          const isNegative = opt?.negative;
          const isEmpty = rawValue === 'EMPTY' || !rawValue;

          return (
            <div
              key={criterion.key}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="text-sm text-gray-600">{criterion.label}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isEmpty
                    ? 'bg-gray-100 text-gray-400'
                    : isPositive
                    ? 'bg-green-100 text-green-700'
                    : isNegative
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
