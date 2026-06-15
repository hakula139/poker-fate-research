export type GameTypeId = '10010101' | '10020101' | '10050301' | '20010103';

export type LeaderboardEntry = {
  leaderboardId: number;
  leaderboardName: string;
  period: string;
  rank: number | null;
  value: number | null;
  gameType: number | null;
};

export type GameStats = {
  gameType: number;
  label: string;
  score: number;
  hands: number;
  winHands: number;
  rounds: number;
  winRounds: number;
  tourRounds: number;
  tourWinRounds: number;
  tourProfit: number;
  tourMaxProfit: number;
  profit: number;
  maxProfit: number;
  vpip: number;
  pfr: number;
  threeBet: number;
  wtsd: number;
  afq: number;
  cbet: number;
};

export type PlayerRecord = {
  uid: number;
  name: string;
  names: string[];
  leaderboardEntries: LeaderboardEntry[];
  games: Partial<Record<GameTypeId, GameStats>>;
  sngRecordCount: number;
  fetchedAt: string;
};

export type PlayerSnapshot = {
  id: string;
  label: string;
  source: string;
  generatedAt: string;
  players: PlayerRecord[];
};

export type SnapshotIndexItem = {
  id: string;
  label: string;
  playerCount: number;
  source: string;
  path: string;
};

export type SnapshotIndex = {
  generatedAt: string;
  snapshots: SnapshotIndexItem[];
};

export type PlayerTag =
  | 'Sample too low'
  | 'Nit'
  | 'TAG'
  | 'LAG'
  | 'Loose-passive'
  | 'Maniac'
  | 'Unclassified';
