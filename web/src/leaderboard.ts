import type { LeaderboardEntry } from './types';

export function periodLabel(period: string): string {
  switch (period) {
    case 'current_week':
      return 'Current week';
    case 'last_week':
      return 'Last week';
    default:
      return period || 'Unknown period';
  }
}

export function bestLeaderboardEntry(entries: LeaderboardEntry[]): LeaderboardEntry | undefined {
  return entries
    .filter((entry) => typeof entry.rank === 'number')
    .sort((left, right) => Number(left.rank) - Number(right.rank))[0];
}

export function leaderboardSummary(entries: LeaderboardEntry[]): string {
  const entry = bestLeaderboardEntry(entries);
  if (!entry) {
    return '-';
  }

  return `#${entry.rank} ${entry.leaderboardName} · ${periodLabel(entry.period)}`;
}
