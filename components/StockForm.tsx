'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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

// ── Component ─────────────────────────────────────────────────
export default function StockForm({ initialData, mode }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
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
      // Calculate and store valuation
      entry_price: preview?.fairValue ?? null,
      review_price: preview?.reviewValue ?? null,
      score: preview?.score ?? 0,
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
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
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
            {s === 1 ? '① 基本資訊' : s === 2 ? '② F.A.C.T.S' : '③ 估值輸入'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* ── Step 1: Basic Info ─── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-4">基本資訊</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  股票代碼 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('symbol')}
                  placeholder="e.g. AAPL"
                  disabled={mode === 'edit'}
                  className={`${inputClass} uppercase disabled:bg-gray-50`}
                />
                {errors.symbol && <p className="text-red-500 text-xs mt-1">{errors.symbol.message}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">股票類型</label>
                <select {...register('type')} className={selectClass}>
                  <option value="Growth">Growth</option>
                  <option value="Dividends">Dividends</option>
                  <option value="Asset">Asset</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">股票名稱</label>
                <input
                  {...register('name')}
                  placeholder="e.g. Apple Inc."
                  className={inputClass}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">加入日期</label>
                <input
                  {...register('added_date')}
                  type="date"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: F.A.C.T.S ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800 mb-4">F.A.C.T.S 評估標準</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FACTS_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <select {...register(field.key as keyof FormData)} className={selectClass}>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                ← 上一步
              </button>
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
            <h2 className="text-base font-semibold text-gray-800 mb-4">估值輸入</h2>

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
