'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface NavActionsProps {
  userDisplay: string | null;
  isLoggedIn: boolean;
  subscriptionStatus?: string;
  logoutAction: () => Promise<void>;
}

export default function NavActions({ userDisplay, isLoggedIn, subscriptionStatus, logoutAction }: NavActionsProps) {
  const { t } = useTranslation();
  const isFree = !subscriptionStatus || subscriptionStatus === 'free';

  return (
    <div className="flex items-center gap-3">
      <LanguageToggle />
      {isLoggedIn ? (
        <>
          {isFree && (
            <a
              href="/pricing"
              className="bg-amber-500 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              {t('nav.upgrade')}
            </a>
          )}
          <a
            href="/pricing#donate"
            className="text-sm text-pink-600 border border-pink-300 px-3 py-2 rounded-lg hover:bg-pink-50 transition-colors"
          >
            {t('nav.donate')}
          </a>
          <a
            href="/stocks/new"
            className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {t('nav.addStock')}
          </a>
          {userDisplay && (
            <span className="text-sm text-gray-600 hidden md:inline">{userDisplay}</span>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </form>
        </>
      ) : (
        <a
          href="/auth/signin"
          className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {t('nav.login')}
        </a>
      )}
    </div>
  );
}
