import type { LeaderboardEntry } from './types';

export type PeriodLabels = {
  currentWeek: string;
  lastWeek: string;
  unknown: string;
};

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

export function bestLeaderboardEntry(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries
    .filter((entry) => typeof entry.rank === 'number')
    .sort((left, right) => Number(left.rank) - Number(right.rank))[0];
}

export function leaderboardSummary(
  entries: LeaderboardEntry[],
  labels: PeriodLabels = defaultPeriodLabels,
): string {
  const entry = bestLeaderboardEntry(entries);
  if (!entry) {
    return '-';
  }

  return `#${entry.rank} ${entry.leaderboardName} · ${periodLabel(entry.period, labels)}`;
}
