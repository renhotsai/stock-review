'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { calculateValuation } from '@/lib/valuation';
import type { Stock } from '@/lib/db';
import { useTranslation } from '@/contexts/LanguageContext';

// ── Zod Schema ────────────────────────────────────────────────
const stockSchema = z.object({
  symbol: z.string().min(1, '必填').max(20),
  name: z.string(),
  type: z.enum(['Growth', 'Dividends', 'Asset']),
  added_date: z.string(),
  // F.A.C.T.S
  eps: z.string(),
  fcf: z.string(),
  roe: z.string(),
  int_cov: z.string(),
  moat: z.string(),
  net_margin: z.string(),
  has_dividends: z.string(),
  policy: z.string(),
  tech_risk: z.string(),
  mgmt_risk: z.string(),
  // Valuation
  eps_value: z.string(),
  growth_rate: z.string(),
  expected_dividend: z.string(),
  dividend_return_rate: z.string(),
  bvps: z.string(),
  discount_factor: z.string(),
  notes: z.string(),
});

type FormData = z.infer<typeof stockSchema>;

// ── Props ─────────────────────────────────────────────────────
type InitialData = Partial<FormData> & { id?: number };

interface Props {
  initialData?: InitialData;
  mode: 'create' | 'edit';
}

// ── Helper ────────────────────────────────────────────────────
function stockToFormPreview(data: FormData): Partial<Stock> {
  return {
    type: data.type,
    eps: data.eps,
    fcf: data.fcf,
    roe: data.roe,
    int_cov: data.int_cov,
    moat: data.moat,
    net_margin: data.net_margin,
    has_dividends: data.has_dividends,
    policy: data.policy,
    tech_risk: data.tech_risk,
    mgmt_risk: data.mgmt_risk,
    eps_value: data.eps_value ? parseFloat(data.eps_value) : null,
    growth_rate: data.growth_rate ? parseFloat(data.growth_rate) : null,
    expected_dividend: data.expected_dividend ? parseFloat(data.expected_dividend) : null,
    dividend_return_rate: parseFloat(data.dividend_return_rate) || 0.04,
    bvps: data.bvps ? parseFloat(data.bvps) : null,
    discount_factor: parseFloat(data.discount_factor) || 0.8,
  } as Partial<Stock>;
}

import type { StockAIPayload } from '@/types/stock';

// ── Component ─────────────────────────────────────────────────
export default function StockForm({ initialData, mode }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState(mode === 'edit' ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [aiPayload, setAiPayload] = useState<StockAIPayload | null>(null);

  // ── FACTS fields (computed inside component to use t()) ──────
  const FACTS_FIELDS: {
    key: keyof FormData;
    label: string;
    options: { value: string; label: string }[];
  }[] = [
    {
      key: 'eps', label: t('stockForm.facts.eps'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'YES', label: t('stockForm.facts.yes') },
        { value: 'NO', label: t('stockForm.facts.no') },
      ],
    },
    {
      key: 'fcf', label: t('stockForm.facts.fcf'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'YES', label: t('stockForm.facts.positive') },
        { value: 'NO', label: t('stockForm.facts.negative') },
      ],
    },
    {
      key: 'roe', label: t('stockForm.facts.roe'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'YES', label: t('stockForm.facts.yes') },
        { value: 'NO', label: t('stockForm.facts.no') },
      ],
    },
    {
      key: 'int_cov', label: t('stockForm.facts.intCov'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'ABOVE_10', label: t('stockForm.facts.above10') },
        { value: 'ABOVE_4', label: t('stockForm.facts.above4') },
        { value: 'NO_DEBT', label: t('stockForm.facts.noDebt') },
        { value: 'NO', label: t('stockForm.facts.insufficient') },
      ],
    },
    {
      key: 'moat', label: t('stockForm.facts.moat'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'TWO_MOATS', label: t('stockForm.facts.twoMoats') },
        { value: 'ONE_MOAT', label: t('stockForm.facts.oneMoat') },
        { value: 'NO', label: t('stockForm.facts.noMoat') },
      ],
    },
    {
      key: 'net_margin', label: t('stockForm.facts.netMargin'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'ABOVE_20', label: t('stockForm.facts.above20') },
        { value: 'ABOVE_10', label: t('stockForm.facts.above10pct') },
        { value: 'INCREASING', label: t('stockForm.facts.increasing') },
        { value: 'NO', label: t('stockForm.facts.belowStandard') },
      ],
    },
    {
      key: 'has_dividends', label: t('stockForm.facts.hasDividends'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'YES', label: t('stockForm.facts.yes') },
        { value: 'NO', label: t('stockForm.facts.no') },
      ],
    },
    {
      key: 'policy', label: t('stockForm.facts.policy'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'YES', label: t('stockForm.facts.yes') },
        { value: 'NO', label: t('stockForm.facts.no') },
      ],
    },
    {
      key: 'tech_risk', label: t('stockForm.facts.techRisk'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'LOW', label: t('stockForm.facts.low') },
        { value: 'MEDIUM', label: t('stockForm.facts.medium') },
        { value: 'HIGH', label: t('stockForm.facts.high') },
      ],
    },
    {
      key: 'mgmt_risk', label: t('stockForm.facts.mgmtRisk'),
      options: [
        { value: 'EMPTY', label: t('stockForm.facts.emptyOption') },
        { value: 'LOW', label: t('stockForm.facts.low') },
        { value: 'MEDIUM', label: t('stockForm.facts.medium') },
        { value: 'HIGH', label: t('stockForm.facts.high') },
      ],
    },
  ];

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      symbol: initialData?.symbol ?? '',
      name: initialData?.name ?? '',
      type: (initialData?.type as 'Growth' | 'Dividends' | 'Asset') ?? 'Dividends',
      added_date: initialData?.added_date ?? '',
      eps: initialData?.eps ?? 'EMPTY',
      fcf: initialData?.fcf ?? 'EMPTY',
      roe: initialData?.roe ?? 'EMPTY',
      int_cov: initialData?.int_cov ?? 'EMPTY',
      moat: initialData?.moat ?? 'EMPTY',
      net_margin: initialData?.net_margin ?? 'EMPTY',
      has_dividends: initialData?.has_dividends ?? 'EMPTY',
      policy: initialData?.policy ?? 'EMPTY',
      tech_risk: initialData?.tech_risk ?? 'EMPTY',
      mgmt_risk: initialData?.mgmt_risk ?? 'EMPTY',
      eps_value: initialData?.eps_value ?? '',
      growth_rate: initialData?.growth_rate ?? '',
      expected_dividend: initialData?.expected_dividend ?? '',
      dividend_return_rate: initialData?.dividend_return_rate ?? '0.04',
      bvps: initialData?.bvps ?? '',
      discount_factor: initialData?.discount_factor ?? '0.8',
      notes: initialData?.notes ?? '',
    },
  });

  const watchedData = watch();
  const selectedType = watchedData.type;

  // Live preview
  const [preview, setPreview] = useState<{ fairValue: number | null; reviewValue: number | null; score: number } | null>(null);
  useEffect(() => {
    const partial = stockToFormPreview(watchedData);
    const result = calculateValuation(partial as Stock);
    setPreview(result);
  }, [watchedData]);

  async function handleLookup() {
    const symbol = watchedData.symbol.trim().toUpperCase();
    if (!symbol) return;

    setFetchError('');
    setProcessing(true);
    setAiPayload(null);

    try {
      const res = await fetch('/api/stocks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData.error ?? t('stockForm.step1.queryFailed'));
        setProcessing(false);
        return;
      }

      const ai: StockAIPayload = await res.json();
      setAiPayload(ai);

      const newValues: Partial<FormData> = {
        name: ai.name ?? symbol,
        type: ai.type,
        added_date: new Date().toISOString().split('T')[0],
        eps: ai.eps,
        fcf: ai.fcf,
        roe: ai.roe,
        int_cov: ai.int_cov,
        moat: ai.moat,
        net_margin: ai.net_margin,
        has_dividends: ai.has_dividends,
        policy: ai.policy,
        tech_risk: ai.tech_risk,
        mgmt_risk: ai.mgmt_risk,
        notes: ai.notes ?? '',
      };
      if (ai.eps_value          != null) newValues.eps_value          = String(ai.eps_value);
      if (ai.growth_rate        != null) newValues.growth_rate        = String(ai.growth_rate);
      if (ai.expected_dividend  != null) newValues.expected_dividend  = String(ai.expected_dividend);
      if (ai.dividend_return_rate != null) newValues.dividend_return_rate = String(ai.dividend_return_rate);
      if (ai.bvps               != null) newValues.bvps               = String(ai.bvps);
      if (ai.discount_factor    != null) newValues.discount_factor    = String(ai.discount_factor);

      const cleanDefaults: FormData = {
        symbol: getValues('symbol'),
        name: '',
        type: ai.type,
        added_date: '',
        eps: 'EMPTY', fcf: 'EMPTY', roe: 'EMPTY', int_cov: 'EMPTY',
        moat: 'EMPTY', net_margin: 'EMPTY', has_dividends: 'EMPTY',
        policy: 'EMPTY', tech_risk: 'EMPTY', mgmt_risk: 'EMPTY',
        eps_value: '', growth_rate: '', expected_dividend: '',
        dividend_return_rate: '0.04', bvps: '', discount_factor: '0.8',
        notes: '',
      };
      reset({ ...cleanDefaults, ...newValues });
      setProcessing(false);
      setStep(2);
    } catch {
      setFetchError(t('stockForm.step1.loadFailed'));
      setProcessing(false);
    }
  }

  async function onSubmit(data: FormData) {
    setError('');
    setLoading(true);

    const payload = {
      symbol: data.symbol.toUpperCase().trim(),
      name: data.name || null,
      type: data.type,
      added_date: data.added_date || null,
      eps: data.eps,
      fcf: data.fcf,
      roe: data.roe,
      int_cov: data.int_cov,
      moat: data.moat,
      net_margin: data.net_margin,
      has_dividends: data.has_dividends,
      policy: data.policy,
      tech_risk: data.tech_risk,
      mgmt_risk: data.mgmt_risk,
      eps_value: data.eps_value ? parseFloat(data.eps_value) : null,
      growth_rate: data.growth_rate ? parseFloat(data.growth_rate) : null,
      expected_dividend: data.expected_dividend ? parseFloat(data.expected_dividend) : null,
      dividend_return_rate: parseFloat(data.dividend_return_rate) || 0.04,
      bvps: data.bvps ? parseFloat(data.bvps) : null,
      discount_factor: parseFloat(data.discount_factor) || 0.8,
      notes: data.notes,
      entry_price: preview?.fairValue ?? null,
      review_price: preview?.reviewValue ?? null,
      score: preview?.score ?? 0,
      data_source: aiPayload?.dataSource ?? null,
      price_as_of: aiPayload?.priceAsOf ?? null,
      ai_confidence: aiPayload?.confidence ?? null,
    };

    try {
      const url = mode === 'edit' && initialData?.id
        ? `/api/stocks/${initialData.id}`
        : '/api/stocks';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error ?? 'Something went wrong');
      }

      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
  const selectClass = inputClass;

  return (
    <div className="max-w-2xl">
      {/* Step indicators — hidden on step 1 create mode */}
      {(mode === 'edit' || step > 1) && (
        <div className="flex items-center gap-2 mb-6">
          {[2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : step > s
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s === 2 ? t('stockForm.stepIndicator.facts') : t('stockForm.stepIndicator.valuation')}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* ── Step 1: Symbol Search (create mode only) ─── */}
        {step === 1 && mode === 'create' && (
          <div>
            {!processing ? (
              <div className="flex flex-col items-center py-8 gap-6">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-800">{t('stockForm.step1.title')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('stockForm.step1.subtitle')}</p>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  <input
                    {...register('symbol')}
                    placeholder="e.g. AAPL, KO, MSFT"
                    className={`${inputClass} text-center text-lg uppercase font-mono tracking-widest`}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                  />
                  {errors.symbol && <p className="text-red-500 text-xs mt-1 text-center">{errors.symbol.message}</p>}
                  {fetchError && <p className="text-red-500 text-xs mt-1 text-center">{fetchError}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('stockForm.step1.analyzeButton')}
                </button>
              </div>
            ) : (
              /* Processing screen */
              <div className="flex flex-col items-center py-12 gap-4">
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-700">
                    {watchedData.symbol.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">{t('stockForm.step1.processing')}</p>
                </div>
                <div className="flex items-center gap-3 text-blue-600">
                  <span className="inline-block animate-spin text-2xl">⏳</span>
                  <span className="text-sm">{t('stockForm.step1.processingNote')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: F.A.C.T.S ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">{t('stockForm.step2.title')}</h2>
              <div className="flex items-center gap-2">
                {aiPayload && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    aiPayload.confidence === 'High'   ? 'text-green-700 bg-green-50' :
                    aiPayload.confidence === 'Medium' ? 'text-yellow-700 bg-yellow-50' :
                                                        'text-orange-700 bg-orange-50'
                  }`}>
                    {aiPayload.confidence === 'High' ? t('stockForm.step2.highConfidence') :
                     aiPayload.confidence === 'Medium' ? t('stockForm.step2.mediumConfidence') : t('stockForm.step2.lowConfidence')}
                  </span>
                )}
                {mode === 'create' && watchedData.name && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{watchedData.name}</span>
                )}
              </div>
            </div>
            {/* AI price info banner */}
            {aiPayload && mode === 'create' && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                aiPayload.confidence === 'Low'
                  ? 'bg-orange-50 border border-orange-200 text-orange-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span>
                    {aiPayload.currentPrice != null
                      ? t('stockForm.step2.aiPrice', {
                          currency: aiPayload.currency ?? '',
                          price: aiPayload.currentPrice.toFixed(2),
                          date: aiPayload.priceAsOf ?? '',
                        })
                      : t('stockForm.step2.priceUnavailable')}
                  </span>
                  {aiPayload.confidence === 'Low' && (
                    <span className="text-xs font-medium">{t('stockForm.step2.lowConfidenceWarning')}</span>
                  )}
                </div>
                {/* Price staleness warning */}
                {aiPayload.priceAsOf && (() => {
                  const days = Math.floor((Date.now() - new Date(aiPayload.priceAsOf).getTime()) / 86400000);
                  return days > 3 ? (
                    <p className="mt-1 text-xs text-orange-600">
                      {t('stockForm.step2.stalePrice', { days })}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
            {/* Stock type selector */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('stockForm.step2.stockType')}</span>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select {...field} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="Growth">{t('stockForm.step2.growthStock')}</option>
                    <option value="Dividends">{t('stockForm.step2.dividendStock')}</option>
                    <option value="Asset">{t('stockForm.step2.assetStock')}</option>
                  </select>
                )}
              />
              <span className="text-xs text-gray-400">{t('stockForm.step2.typeEffect')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FACTS_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <Controller
                    name={field.key as keyof FormData}
                    control={control}
                    render={({ field: ctrlField }) => (
                      <select {...ctrlField} className={selectClass}>
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-4">
              {mode === 'create' ? (
                <button
                  type="button"
                  onClick={() => { setStep(1); setProcessing(false); setAiPayload(null); }}
                  className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('stockForm.step2.requery')}
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {t('stockForm.step2.next')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Valuation + Preview ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">{t('stockForm.step3.title')}</h2>
              {mode === 'create' && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {watchedData.name || watchedData.symbol} · {watchedData.type}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedType === 'Growth' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.eps')}</label>
                    <input {...register('eps_value')} type="number" step="0.01" placeholder="e.g. 6.50" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.growthRate')}</label>
                    <input {...register('growth_rate')} type="number" step="0.1" placeholder="e.g. 15" className={inputClass} />
                  </div>
                </>
              )}

              {selectedType === 'Dividends' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.annualDividend')}</label>
                    <input {...register('expected_dividend')} type="number" step="0.01" placeholder="e.g. 2.80" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.returnRate')}</label>
                    <input {...register('dividend_return_rate')} type="number" step="0.001" placeholder="e.g. 0.04" className={inputClass} />
                    <p className="text-xs text-gray-400 mt-1">{t('stockForm.step3.returnRateHint')}</p>
                  </div>
                </>
              )}

              {selectedType === 'Asset' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.bvps')}</label>
                    <input {...register('bvps')} type="number" step="0.01" placeholder="e.g. 120.00" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.discountFactor')}</label>
                    <input {...register('discount_factor')} type="number" step="0.01" placeholder="e.g. 0.8" className={inputClass} />
                    <p className="text-xs text-gray-400 mt-1">{t('stockForm.step3.discountFactorHint')}</p>
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stockForm.step3.notes')}</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder={t('stockForm.step3.notesPlaceholder')}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            {/* Live Preview */}
            {preview && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-2">{t('stockForm.step3.previewTitle')}</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">{t('stockForm.step3.confidenceScore')}</p>
                    <p className="text-lg font-bold text-blue-700">{preview.score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('stockForm.step3.fairValue')}</p>
                    <p className="text-lg font-bold text-green-700">
                      {preview.fairValue != null ? `$${preview.fairValue.toFixed(2)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('stockForm.step3.reviewValue')}</p>
                    <p className="text-lg font-bold text-yellow-700">
                      {preview.reviewValue != null ? `$${preview.reviewValue.toFixed(2)}` : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('stockForm.step3.back')}
              </button>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t('stockForm.step3.cancel')}
                </a>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t('stockForm.step3.saving') : mode === 'edit' ? t('stockForm.step3.updateStock') : t('stockForm.step3.addStock')}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
