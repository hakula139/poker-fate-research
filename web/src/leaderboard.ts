import type { LeaderboardEntry } from './types';

export type PeriodLabels = {
  currentWeek: string;
  lastWeek: string;
  unknown: string;
};

export type LeaderboardNameLabels = Record<string, string>;

export const leaderboardNameOrder = [
  'Honor Points',
  'Throne Points',
  'Classic Winnings',
  'Casual Winnings',
  'Winnings',
];

const periodOrder = ['current_week', 'last_week'];

const defaultPeriodLabels: PeriodLabels = {
  currentWeek: 'Current week',
  lastWeek: 'Last week',
  unknown: 'Unknown period',
};

export function periodLabel(period: string, labels: PeriodLabels = defaultPeriodLabels): string {
  switch (period) {
    case 'current_week':
      return labels.currentWeek;
    case 'last_week':
      return labels.lastWeek;
    default:
      return period || labels.unknown;
  }
}

export function leaderboardNameLabel(name: string, labels: LeaderboardNameLabels = {}): string {
  return labels[name] ?? name;
}

function orderIndex(values: string[], value: string): number {
  const index = values.indexOf(value);
  return index === -1 ? values.length : index;
}

export function compareLeaderboardEntries(left: LeaderboardEntry, right: LeaderboardEntry): number {
  return (
    orderIndex(leaderboardNameOrder, left.leaderboardName) -
      orderIndex(leaderboardNameOrder, right.leaderboardName) ||
    orderIndex(periodOrder, left.period) - orderIndex(periodOrder, right.period) ||
    (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
  );
}
