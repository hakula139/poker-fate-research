import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import enMessages from './locales/en.json';
import zhCNMessages from './locales/zh-CN.json';
import { readString, storageKeys, writeString } from './storage';
import type { GameTypeId, PostflopTag, PreflopTag } from './types';

export type Locale = 'en' | 'zh-CN';

type PlayerTag = PreflopTag | PostflopTag;

export type Messages = {
  app: {
    eyebrow: string;
    title: string;
    loading: string;
    dataIssue: string;
  };
  controls: {
    language: string;
    theme: string;
    snapshot: string;
    search: string;
    searchPlaceholder: string;
    gameType: string;
  };
  languages: Record<Locale, string>;
  themes: {
    system: string;
    light: string;
    dark: string;
  };
  gameTypes: Record<GameTypeId, string>;
  summary: {
    players: string;
    visible: string;
    snapshot: string;
  };
  table: {
    player: string;
    bestRank: string;
    hands: string;
    profit: string;
    vpip: string;
    pfr: string;
    threeBet: string;
    wtsd: string;
    afq: string;
    cbet: string;
    tag: string;
  };
  details: {
    player: string;
    selectPlayer: string;
    score: string;
    sngRecords: string;
    leaderboardRanks: string;
    noLeaderboardRows: string;
  };
  periods: {
    currentWeek: string;
    lastWeek: string;
    unknown: string;
  };
  tags: Record<PlayerTag, string>;
};

export const localeOptions: { id: Locale }[] = [{ id: 'en' }, { id: 'zh-CN' }];

export const messages: Record<Locale, Messages> = {
  'en': enMessages,
  'zh-CN': zhCNMessages,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'zh-CN';
}

function getInitialLocale(): Locale {
  const stored = readString(storageKeys.locale);
  if (isLocale(stored)) {
    return stored;
  }

  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
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
