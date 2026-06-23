import enMessages from './locales/en.json';
import zhHansMessages from './locales/zh-Hans.json';
import type { PostflopTag, PreflopTag } from './types';

export type Locale = 'en' | 'zh-Hans';

type PlayerTag = PreflopTag | PostflopTag;

export type Messages = {
  app: {
    eyebrow: string;
    title: string;
    loading: string;
    dataUnavailable: string;
    dataIssues: {
      unavailable: string;
      invalid: string;
      unknown: string;
    };
  };
  controls: {
    language: string;
    theme: string;
    search: string;
    searchPlaceholder: string;
  };
  languages: Record<Locale, string>;
  themes: {
    system: string;
    light: string;
    dark: string;
  };
  summary: {
    players: string;
    visible: string;
    updated: string;
  };
  table: {
    player: string;
    hands: string;
    profit: string;
    vpip: string;
    pfr: string;
    threeBet: string;
    wtsd: string;
    afq: string;
    cbet: string;
    tag: string;
    updated: string;
    noPlayers: string;
  };
  statDescriptions: {
    vpip: string;
    pfr: string;
    threeBet: string;
    wtsd: string;
    afq: string;
    cbet: string;
  };
  details: {
    player: string;
    thronePoints: string;
    leaderboardRanks: string;
    noLeaderboardRows: string;
    noMatchingPlayer: string;
    updated: string;
    refreshing: string;
    value: string;
  };
  periods: {
    currentWeek: string;
    lastWeek: string;
    unknown: string;
  };
  leaderboards: Record<string, string>;
  tags: Record<PlayerTag, string>;
};

export const localeOptions: { id: Locale }[] = [{ id: 'en' }, { id: 'zh-Hans' }];

export const messages: Record<Locale, Messages> = {
  'en': enMessages,
  'zh-Hans': zhHansMessages,
};

export function localeFromLanguageTag(value: string | null): Locale | null {
  const normalized = value?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (
    normalized === 'zh-hans' ||
    normalized.startsWith('zh-hans-') ||
    normalized === 'zh-cn' ||
    normalized === 'zh-sg'
  ) {
    return 'zh-Hans';
  }
  return null;
}
