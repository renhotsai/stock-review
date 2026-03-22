'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zh from '@/messages/zh.json';
import en from '@/messages/en.json';

type Locale = 'zh' | 'en';

const messages: Record<Locale, Record<string, unknown>> = { zh, en };

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Locale;
    if (saved === 'en' || saved === 'zh') setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('lang', l);
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const parts = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = messages[locale];
    for (const part of parts) {
      val = val?.[part];
    }
    if (typeof val !== 'string') return key;
    if (!vars) return val;
    return val.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useTranslation = () => useContext(LanguageContext);
