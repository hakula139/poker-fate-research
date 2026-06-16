import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { createFormatters, type NumberFormatters } from './format';
import { type Locale, localeFromLanguageTag, type Messages, messages } from './locale';
import { readString, storageKeys, writeString } from './storage';

type I18nContextValue = {
  format: NumberFormatters;
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

  return localeFromLanguageTag(value);
}

function getInitialLocale(): Locale {
  const stored = storedLocale(readString(storageKeys.locale));
  if (stored) {
    return stored;
  }

  if (typeof navigator !== 'undefined') {
    const browserLocales = navigator.languages.length ? navigator.languages : [navigator.language];
    for (const browserLocale of browserLocales) {
      const locale = localeFromLanguageTag(browserLocale);
      if (locale) {
        return locale;
      }
    }
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
      format: createFormatters(locale),
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
