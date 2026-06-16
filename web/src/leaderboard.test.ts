import { describe, expect, it } from 'vitest';

import {
  bestLeaderboardEntry,
  compareLeaderboardEntries,
  leaderboardNameLabel,
  leaderboardNameOrder,
  leaderboardSummary,
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

  it('uses translated leaderboard names', () => {
    expect(
      leaderboardSummary([entry(7, 'current_week')], undefined, {
        'Throne Points': '王座积分',
      }),
    ).toBe('#7 王座积分 · Current week');
  });
});

describe('leaderboardNameLabel', () => {
  it('falls back to the API name for unknown leaderboards', () => {
    expect(leaderboardNameLabel('Seasonal Board', {})).toBe('Seasonal Board');
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
