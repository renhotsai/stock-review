'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface PricingViewProps {
  subscriptionStatus: string;
  hasCustomer: boolean;
  isLoggedIn: boolean;
  periodEnd?: string | null;
}

function PricingContent({ subscriptionStatus, hasCustomer, isLoggedIn, periodEnd }: PricingViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<'subscription' | 'donation' | 'portal' | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('subscribed') === '1') {
      setFlash(t('pricing.successSubscribed'));
    } else if (searchParams.get('donated') === '1') {
      setFlash(t('pricing.successDonated'));
    }
  }, [searchParams, t]);

  async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function handleCheckout(type: 'subscription' | 'donation') {
    if (!isLoggedIn) {
      router.push('/auth/signin');
      return;
    }
    setError(null);
    setLoading(type);
    try {
      const res = await fetchWithTimeout('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(err instanceof Error && err.name === 'AbortError' ? '請求逾時，請稍後再試。' : msg);
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setError(null);
    setLoading('portal');
    try {
      const res = await fetchWithTimeout('/api/stripe/create-portal', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setError(err instanceof Error && err.name === 'AbortError' ? '請求逾時，請稍後再試。' : msg);
    } finally {
      setLoading(null);
    }
  }

  const isPro = subscriptionStatus === 'active';
  const isCanceling = subscriptionStatus === 'canceling';
  const isPastDue = subscriptionStatus === 'past_due';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('pricing.title')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('pricing.subtitle')}</p>

      {flash && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-green-800 text-sm font-medium">
          {flash}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-red-700 text-sm">
          <span className="font-medium">Error: </span>{error}
        </div>
      )}

      {isPastDue && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-red-700 text-sm">
          {t('pricing.subscriptionPastDue')}
        </div>
      )}

      {isCanceling && periodEnd && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-amber-800 text-sm">
          {t('pricing.subscriptionCanceling', { date: new Date(periodEnd).toLocaleDateString('zh-TW') })}
          {' '}
          <button onClick={handlePortal} className="underline font-medium">
            {t('pricing.reactivate')}
          </button>
        </div>
      )}

      {/* Plans grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Free plan */}
        <div className={`rounded-xl border-2 p-6 ${!isPro && !isCanceling ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t('pricing.freePlan')}</h2>
            {!isPro && !isCanceling && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {t('pricing.currentPlan')}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{t('pricing.freePrice')}</p>
          <ul className="space-y-2 mt-4 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t('pricing.freeLimit')}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t('pricing.allFeatures')}
            </li>
          </ul>
        </div>

        {/* Pro plan */}
        <div className={`rounded-xl border-2 p-6 ${isPro || isCanceling ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{t('pricing.proPlan')}</h2>
            {(isPro || isCanceling) && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isCanceling ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {isCanceling ? t('pricing.cancelingPlan') : t('pricing.currentPlan')}
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            $10 CAD
            <span className="text-base font-normal text-gray-500">{t('pricing.perMonth')}</span>
          </p>
          <ul className="space-y-2 mt-4 text-sm text-gray-600 mb-6">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t('pricing.proLimit')}
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {t('pricing.allFeatures')}
            </li>
          </ul>

          {isPro || isCanceling || isPastDue ? (
            <button
              onClick={handlePortal}
              disabled={loading === 'portal'}
              className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading === 'portal' ? '處理中...' : t('pricing.manageSubscription')}
            </button>
          ) : (
            <button
              onClick={() => handleCheckout('subscription')}
              disabled={loading === 'subscription'}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading === 'subscription' ? '跳轉至付款頁面...' : t('pricing.upgrade')}
            </button>
          )}
        </div>
      </div>

      {/* Donate section */}
      <div id="donate" className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{t('pricing.donateTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('pricing.donateDesc')}</p>
        <button
          onClick={() => handleCheckout('donation')}
          disabled={loading === 'donation'}
          className="bg-pink-500 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
        >
          {loading === 'donation' ? '跳轉至付款頁面...' : t('pricing.donate')}
        </button>
      </div>
    </div>
  );
}

export default function PricingView(props: PricingViewProps) {
  return (
    <Suspense>
      <PricingContent {...props} />
    </Suspense>
  );
}

