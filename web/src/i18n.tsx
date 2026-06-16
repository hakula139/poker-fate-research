import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { messages, type Locale, type Messages } from './locale';
import { readString, storageKeys, writeString } from './storage';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh-Hans';
}

function storedLocale(value: string | null): Locale | null {
  if (isLocale(value)) {
    return value;
  }

  return value === 'zh-CN' ? 'zh-Hans' : null;
}

function getInitialLocale(): Locale {
  const stored = storedLocale(readString(storageKeys.locale));
  if (stored) {
    return stored;
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh-Hans';
  }

  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    writeString(storageKeys.locale, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: messages[locale],
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return value;
}
