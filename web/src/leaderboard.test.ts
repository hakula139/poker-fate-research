import { describe, expect, it } from 'vitest';

import { bestLeaderboardEntry, leaderboardSummary, periodLabel } from './leaderboard';
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

describe('bestLeaderboardEntry', () => {
  it('chooses the highest rank across periods and boards', () => {
    expect(
      bestLeaderboardEntry([
        entry(7, 'current_week'),
        entry(4, 'last_week'),
        entry(6, 'current_week', 'Classic Winnings'),
      ]),
    ).toEqual(entry(4, 'last_week'));
  });

  it('ignores entries without ranks', () => {
    expect(bestLeaderboardEntry([entry(null, 'current_week'), entry(8, 'last_week')])).toEqual(
      entry(8, 'last_week'),
    );
  });
});

describe('leaderboardSummary', () => {
  it('includes rank, board, and period', () => {
    expect(leaderboardSummary([entry(7, 'current_week'), entry(4, 'last_week')])).toBe(
      '#4 Throne Points · Last week',
    );
  });
});
