import enMessages from './locales/en.json';
import zhHansMessages from './locales/zh-Hans.json';
import type { GameTypeId, PostflopTag, PreflopTag } from './types';

export type Locale = 'en' | 'zh-Hans';

type PlayerTag = PreflopTag | PostflopTag;

export type Messages = {
  app: {
    eyebrow: string;
    title: string;
    loading: string;
    sampleDataIssue: string;
    snapshotDataIssue: string;
    dataIssues: {
      indexUnavailable: string;
      indexInvalid: string;
      indexEmpty: string;
      snapshotUnavailable: string;
      snapshotInvalid: string;
      unknown: string;
    };
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
  leaderboards: Record<string, string>;
  tags: Record<PlayerTag, string>;
};

export const localeOptions: { id: Locale }[] = [{ id: 'en' }, { id: 'zh-Hans' }];

export const messages: Record<Locale, Messages> = {
  'en': enMessages,
  'zh-Hans': zhHansMessages,
};
