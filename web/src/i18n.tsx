import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { readString, storageKeys, writeString } from './storage';
import type { GameTypeId, PostflopTag, PreflopTag } from './types';

export type Locale = 'en' | 'zh-CN';

type PlayerTag = PreflopTag | PostflopTag;

export type Messages = {
  app: {
    eyebrow: string;
    title: string;
    loading: string;
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

const en: Messages = {
  app: {
    eyebrow: 'Poker Fate research',
    title: 'Player stats',
    loading: 'Loading player stats',
  },
  controls: {
    language: 'Language',
    theme: 'Theme',
    snapshot: 'Snapshot',
    search: 'Search',
    searchPlaceholder: 'Name or UID',
    gameType: 'Game type',
  },
  languages: {
    en: 'English',
    'zh-CN': '中文',
  },
  themes: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  gameTypes: {
    '10010101': "Hold'em",
    '10020101': 'Omaha',
    '10050301': 'SNG',
    '20010103': 'Friend room',
  },
  summary: {
    players: 'Players',
    visible: 'Visible',
    snapshot: 'Snapshot',
  },
  table: {
    player: 'Player',
    bestRank: 'Best rank',
    hands: 'Hands',
    profit: 'Profit',
    vpip: 'VPIP',
    pfr: 'PFR',
    threeBet: '3-Bet',
    wtsd: 'WTSD',
    afq: 'AFq',
    cbet: 'C-Bet',
    tag: 'Tag',
  },
  details: {
    player: 'Player',
    selectPlayer: 'Select a player',
    score: 'Score',
    sngRecords: 'SNG records',
    leaderboardRanks: 'Leaderboard ranks',
    noLeaderboardRows: 'No leaderboard rows',
  },
  periods: {
    currentWeek: 'Current week',
    lastWeek: 'Last week',
    unknown: 'Unknown period',
  },
  tags: {
    'Sample too low': 'Sample too low',
    Nit: 'Nit',
    TAG: 'TAG',
    'Tight-passive': 'Tight-passive',
    LAG: 'LAG',
    'Loose-balanced': 'Loose-balanced',
    'Loose-passive': 'Loose-passive',
    Maniac: 'Maniac',
    'Fit-or-fold': 'Fit-or-fold',
    'Showdown caller': 'Showdown caller',
    'Showdown-heavy': 'Showdown-heavy',
    'Postflop passive': 'Postflop passive',
    'Postflop aggressor': 'Postflop aggressor',
    'Postflop balanced': 'Postflop balanced',
  },
};

const zhCN: Messages = {
  app: {
    eyebrow: 'Poker Fate 研究',
    title: '玩家数据',
    loading: '正在加载玩家数据',
  },
  controls: {
    language: '语言',
    theme: '主题',
    snapshot: '快照',
    search: '搜索',
    searchPlaceholder: '名称或 UID',
    gameType: '模式',
  },
  languages: {
    en: 'English',
    'zh-CN': '中文',
  },
  themes: {
    system: '跟随系统',
    light: '浅色',
    dark: '深色',
  },
  gameTypes: {
    '10010101': '德州扑克',
    '10020101': '奥马哈',
    '10050301': 'SNG',
    '20010103': '好友房',
  },
  summary: {
    players: '玩家数',
    visible: '当前显示',
    snapshot: '快照',
  },
  table: {
    player: '玩家',
    bestRank: '最高排名',
    hands: '手数',
    profit: '盈利',
    vpip: 'VPIP',
    pfr: 'PFR',
    threeBet: '3-Bet',
    wtsd: 'WTSD',
    afq: 'AFq',
    cbet: 'C-Bet',
    tag: '标签',
  },
  details: {
    player: '玩家',
    selectPlayer: '选择一个玩家',
    score: '积分',
    sngRecords: 'SNG 记录',
    leaderboardRanks: '排行榜排名',
    noLeaderboardRows: '没有排行榜记录',
  },
  periods: {
    currentWeek: '本周',
    lastWeek: '上周',
    unknown: '未知周期',
  },
  tags: {
    'Sample too low': '样本不足',
    Nit: '超紧',
    TAG: '紧凶',
    'Tight-passive': '紧弱',
    LAG: '松凶',
    'Loose-balanced': '松而均衡',
    'Loose-passive': '松弱',
    Maniac: '疯凶',
    'Fit-or-fold': '不中即弃',
    'Showdown caller': '摊牌跟注型',
    'Showdown-heavy': '摊牌偏多',
    'Postflop passive': '翻后偏被动',
    'Postflop aggressor': '翻后激进',
    'Postflop balanced': '翻后均衡',
  },
};

export const messages: Record<Locale, Messages> = {
  en,
  'zh-CN': zhCN,
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
