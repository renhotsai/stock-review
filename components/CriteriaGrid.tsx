'use client';

import type { Stock } from '@/lib/db';
import { useTranslation } from '@/contexts/LanguageContext';

interface CriterionItem {
  key: keyof Stock;
  labelKey: string;
  options: { value: string; labelKey: string; positive?: boolean; negative?: boolean }[];
}

const CRITERIA: CriterionItem[] = [
  {
    key: 'eps',
    labelKey: 'stockForm.facts.eps',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'YES', labelKey: 'criteriaGrid.yes', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.no', negative: true },
    ],
  },
  {
    key: 'fcf',
    labelKey: 'stockForm.facts.fcf',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'YES', labelKey: 'criteriaGrid.positive', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.negative', negative: true },
    ],
  },
  {
    key: 'roe',
    labelKey: 'stockForm.facts.roe',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'YES', labelKey: 'criteriaGrid.yes', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.no', negative: true },
    ],
  },
  {
    key: 'int_cov',
    labelKey: 'stockForm.facts.intCov',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'ABOVE_10', labelKey: 'criteriaGrid.above10', positive: true },
      { value: 'ABOVE_4', labelKey: 'criteriaGrid.above4' },
      { value: 'NO_DEBT', labelKey: 'criteriaGrid.noDebt', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.insufficient', negative: true },
    ],
  },
  {
    key: 'moat',
    labelKey: 'stockForm.facts.moat',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'TWO_MOATS', labelKey: 'criteriaGrid.twoMoats', positive: true },
      { value: 'ONE_MOAT', labelKey: 'criteriaGrid.oneMoat' },
      { value: 'NO', labelKey: 'criteriaGrid.noMoat', negative: true },
    ],
  },
  {
    key: 'net_margin',
    labelKey: 'stockForm.facts.netMargin',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'ABOVE_20', labelKey: 'criteriaGrid.above20', positive: true },
      { value: 'ABOVE_10', labelKey: 'criteriaGrid.above10pct' },
      { value: 'INCREASING', labelKey: 'criteriaGrid.increasing' },
      { value: 'NO', labelKey: 'criteriaGrid.belowStandard', negative: true },
    ],
  },
  {
    key: 'has_dividends',
    labelKey: 'stockForm.facts.hasDividends',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'YES', labelKey: 'criteriaGrid.yes', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.no', negative: true },
    ],
  },
  {
    key: 'policy',
    labelKey: 'stockForm.facts.policy',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'YES', labelKey: 'criteriaGrid.yes', positive: true },
      { value: 'NO', labelKey: 'criteriaGrid.no', negative: true },
    ],
  },
  {
    key: 'tech_risk',
    labelKey: 'stockForm.facts.techRisk',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'LOW', labelKey: 'criteriaGrid.low', positive: true },
      { value: 'MEDIUM', labelKey: 'criteriaGrid.medium' },
      { value: 'HIGH', labelKey: 'criteriaGrid.high', negative: true },
    ],
  },
  {
    key: 'mgmt_risk',
    labelKey: 'stockForm.facts.mgmtRisk',
    options: [
      { value: 'EMPTY', labelKey: 'criteriaGrid.notAssessed' },
      { value: 'LOW', labelKey: 'criteriaGrid.low', positive: true },
      { value: 'MEDIUM', labelKey: 'criteriaGrid.medium' },
      { value: 'HIGH', labelKey: 'criteriaGrid.high', negative: true },
    ],
  },
];

interface CriteriaGridProps {
  stock: Stock;
}

export default function CriteriaGrid({ stock }: CriteriaGridProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">{t('criteriaGrid.title')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CRITERIA.map((criterion) => {
          const rawValue = stock[criterion.key] as string;
          const opt = criterion.options.find((o) => o.value === rawValue);
          const label = opt ? t(opt.labelKey) : rawValue;
          const isPositive = opt?.positive;
          const isNegative = opt?.negative;
          const isEmpty = rawValue === 'EMPTY' || !rawValue;

          return (
            <div
              key={criterion.key}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
            >
              <span className="text-sm text-gray-600">{t(criterion.labelKey)}</span>
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
