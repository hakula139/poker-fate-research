import { describe, expect, it } from 'vitest';

import {
  compareLeaderboardEntries,
  leaderboardNameLabel,
  leaderboardNameOrder,
  periodLabel,
} from './leaderboard';
import type { LeaderboardEntry } from './types';

function entry(rank: number | null, period: string, leaderboardName = 'Throne Points') {
  return {
    leaderboardId: 2,
    leaderboardName,
    period,
    rank,
    value: 0,
    gameType: 10010101,
  } satisfies LeaderboardEntry;
}

describe('periodLabel', () => {
  it('formats known leaderboard periods', () => {
    expect(periodLabel('current_week')).toBe('Current week');
    expect(periodLabel('last_week')).toBe('Last week');
  });
});

describe('leaderboardNameLabel', () => {
  it('falls back to the API name for unknown leaderboards', () => {
    expect(leaderboardNameLabel('Seasonal Board', {})).toBe('Seasonal Board');
  });

  it('uses translated leaderboard names', () => {
    expect(leaderboardNameLabel('Throne Points', { 'Throne Points': '王座积分' })).toBe('王座积分');
  });
});

describe('compareLeaderboardEntries', () => {
  it('keeps leaderboard names in client order', () => {
    expect(leaderboardNameOrder).toEqual([
      'Honor Points',
      'Throne Points',
      'Classic Winnings',
      'Casual Winnings',
      'Winnings',
    ]);
  });

  it('sorts entries by board, period, then rank', () => {
    const entries = [
      entry(4, 'last_week', 'Throne Points'),
      entry(1, 'last_week', 'Classic Winnings'),
      entry(7, 'current_week', 'Throne Points'),
      entry(2, 'current_week', 'Honor Points'),
    ].sort(compareLeaderboardEntries);

    expect(entries).toEqual([
      entry(2, 'current_week', 'Honor Points'),
      entry(7, 'current_week', 'Throne Points'),
      entry(4, 'last_week', 'Throne Points'),
      entry(1, 'last_week', 'Classic Winnings'),
    ]);
  });
});
