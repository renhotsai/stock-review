'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { calculateValuation } from '@/lib/valuation';
import type { Stock } from '@/lib/db';

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

// ── Dropdown options ──────────────────────────────────────────
const FACTS_FIELDS: {
  key: keyof FormData;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'eps', label: 'EPS 穩定增長',
    options: [{ value: 'EMPTY', label: '— 未評估 —' }, { value: 'YES', label: '✓ 是' }, { value: 'NO', label: '✗ 否' }],
  },
  {
    key: 'fcf', label: '自由現金流 (FCF)',
    options: [{ value: 'EMPTY', label: '— 未評估 —' }, { value: 'YES', label: '✓ 正值' }, { value: 'NO', label: '✗ 負值' }],
  },
  {
    key: 'roe', label: 'ROE > 15%',
    options: [{ value: 'EMPTY', label: '— 未評估 —' }, { value: 'YES', label: '✓ 是' }, { value: 'NO', label: '✗ 否' }],
  },
  {
    key: 'int_cov', label: '利息覆蓋率',
    options: [
      { value: 'EMPTY', label: '— 未評估 —' },
      { value: 'ABOVE_10', label: '> 10x' },
      { value: 'ABOVE_4', label: '> 4x' },
      { value: 'NO_DEBT', label: '無負債' },
      { value: 'NO', label: '不足' },
    ],
  },
  {
    key: 'moat', label: '護城河',
    options: [
      { value: 'EMPTY', label: '— 未評估 —' },
      { value: 'TWO_MOATS', label: '兩項護城河' },
      { value: 'ONE_MOAT', label: '一項護城河' },
      { value: 'NO', label: '無護城河' },
    ],
  },
  {
    key: 'net_margin', label: '淨利潤率',
    options: [
      { value: 'EMPTY', label: '— 未評估 —' },
      { value: 'ABOVE_20', label: '> 20%' },
      { value: 'ABOVE_10', label: '> 10%' },
      { value: 'INCREASING', label: '持續增長' },
      { value: 'NO', label: '不達標' },
    ],
  },
  {
    key: 'has_dividends', label: '派發股息',
    options: [{ value: 'EMPTY', label: '— 未評估 —' }, { value: 'YES', label: '✓ 是' }, { value: 'NO', label: '✗ 否' }],
  },
  {
    key: 'policy', label: '股東友善政策',
    options: [{ value: 'EMPTY', label: '— 未評估 —' }, { value: 'YES', label: '✓ 是' }, { value: 'NO', label: '✗ 否' }],
  },
  {
    key: 'tech_risk', label: '科技顛覆風險',
    options: [
      { value: 'EMPTY', label: '— 未評估 —' },
      { value: 'LOW', label: '低' },
      { value: 'MEDIUM', label: '中' },
      { value: 'HIGH', label: '高' },
    ],
  },
  {
    key: 'mgmt_risk', label: '管理層風險',
    options: [
      { value: 'EMPTY', label: '— 未評估 —' },
      { value: 'LOW', label: '低' },
      { value: 'MEDIUM', label: '中' },
      { value: 'HIGH', label: '高' },
    ],
  },
];

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
  const [step, setStep] = useState(mode === 'edit' ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [aiPayload, setAiPayload] = useState<StockAIPayload | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
        setFetchError(errData.error ?? '查詢失敗，請稍後再試');
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
      setFetchError('載入失敗，請稍後再試');
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

      router.push('/');
      router.refresh();
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
              {s === 2 ? '① F.A.C.T.S' : '② 估值輸入'}
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
                  <h2 className="text-lg font-semibold text-gray-800">輸入股票代號</h2>
                  <p className="text-sm text-gray-500 mt-1">AI 將自動查詢所有財務數據</p>
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
                  AI 分析 →
                </button>
              </div>
            ) : (
              /* Processing screen */
              <div className="flex flex-col items-center py-12 gap-4">
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-700">
                    {watchedData.symbol.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">AI 正在查詢財務數據及分析中…</p>
                </div>
                <div className="flex items-center gap-3 text-blue-600">
                  <span className="inline-block animate-spin text-2xl">⏳</span>
                  <span className="text-sm">這可能需要 15–30 秒</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: F.A.C.T.S ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">F.A.C.T.S 評估標準</h2>
              <div className="flex items-center gap-2">
                {aiPayload && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    aiPayload.confidence === 'High'   ? 'text-green-700 bg-green-50' :
                    aiPayload.confidence === 'Medium' ? 'text-yellow-700 bg-yellow-50' :
                                                        'text-orange-700 bg-orange-50'
                  }`}>
                    {aiPayload.confidence === 'High' ? '✓ 高信心' :
                     aiPayload.confidence === 'Medium' ? '～ 中信心' : '⚠ 低信心'}
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
                      ? `📈 AI 查詢股價：${aiPayload.currency} ${aiPayload.currentPrice.toFixed(2)} （${aiPayload.priceAsOf}）`
                      : '股價未能取得'}
                  </span>
                  {aiPayload.confidence === 'Low' && (
                    <span className="text-xs font-medium">⚠ 數據可能超過 12 個月，建議人工核實</span>
                  )}
                </div>
                {/* Price staleness warning */}
                {aiPayload.priceAsOf && (() => {
                  const days = Math.floor((Date.now() - new Date(aiPayload.priceAsOf).getTime()) / 86400000);
                  return days > 3 ? (
                    <p className="mt-1 text-xs text-orange-600">⚠ 股價已有 {days} 天未更新，建議重新分析</p>
                  ) : null;
                })()}
              </div>
            )}
            {/* Stock type selector */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">股票類型</span>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <select {...field} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="Growth">Growth 成長股</option>
                    <option value="Dividends">Dividends 股息股</option>
                    <option value="Asset">Asset 資產股</option>
                  </select>
                )}
              />
              <span className="text-xs text-gray-400">影響估值方式</span>
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
                  ← 重新查詢
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Valuation + Preview ─── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">估值輸入</h2>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">EPS (每股盈利)</label>
                    <input {...register('eps_value')} type="number" step="0.01" placeholder="e.g. 6.50" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">成長倍數 (Growth Rate)</label>
                    <input {...register('growth_rate')} type="number" step="0.1" placeholder="e.g. 15" className={inputClass} />
                  </div>
                </>
              )}

              {selectedType === 'Dividends' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">年化股息 (Expected Dividend)</label>
                    <input {...register('expected_dividend')} type="number" step="0.01" placeholder="e.g. 2.80" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">目標殖利率 (Return Rate)</label>
                    <input {...register('dividend_return_rate')} type="number" step="0.001" placeholder="e.g. 0.04" className={inputClass} />
                    <p className="text-xs text-gray-400 mt-1">預設 4% = 0.04</p>
                  </div>
                </>
              )}

              {selectedType === 'Asset' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">每股帳面價值 (BVPS)</label>
                    <input {...register('bvps')} type="number" step="0.01" placeholder="e.g. 120.00" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">折扣因子 (Discount Factor)</label>
                    <input {...register('discount_factor')} type="number" step="0.01" placeholder="e.g. 0.8" className={inputClass} />
                    <p className="text-xs text-gray-400 mt-1">預設 0.8 (80%)</p>
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  placeholder="投資理由、風險提示…"
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            {/* Live Preview */}
            {preview && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-2">估值預覽</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">信心分數</p>
                    <p className="text-lg font-bold text-blue-700">{preview.score.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">合理買入價</p>
                    <p className="text-lg font-bold text-green-700">
                      {preview.fairValue != null ? `$${preview.fairValue.toFixed(2)}` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">重新估值</p>
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
                ← 上一步
              </button>
              <div className="flex gap-3">
                <a
                  href="/"
                  className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  取消
                </a>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '儲存中…' : mode === 'edit' ? '更新股票' : '新增股票'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
