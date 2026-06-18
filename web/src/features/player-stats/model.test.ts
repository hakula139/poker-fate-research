import { describe, expect, it } from 'vitest';

import { sampleSnapshot } from '@/fixtures/sampleData';

import { filterAndSortPlayers, getGameStats, scoreLabelKey, snapshotDisplayLabel } from './model';

describe('player stats model', () => {
  it('filters by player UID and sorts by selected game stats', () => {
    const players = filterAndSortPlayers({
      gameType: '10010101',
      players: sampleSnapshot.players,
      query: '10410931',
      sort: { key: 'profit', direction: 'desc' },
    });

    expect(players.map((player) => player.uid)).toEqual([10410931]);
    expect(getGameStats(players[0], '10010101')?.profit).toBe(94114872);
  });

  it('sorts missing stats after real stats in descending numeric sorts', () => {
    const holdemStats = getGameStats(sampleSnapshot.players[1], '10010101');
    if (!holdemStats) {
      throw new Error('sample player is missing Holdem stats');
    }
    const playersWithMixedOmahaStats = [
      sampleSnapshot.players[0],
      {
        ...sampleSnapshot.players[1],
        games: {
          ...sampleSnapshot.players[1].games,
          '10020101': {
            ...holdemStats,
            gameType: 10020101,
            hands: 7,
          },
        },
      },
    ];

    const players = filterAndSortPlayers({
      gameType: '10020101',
      players: playersWithMixedOmahaStats,
      query: '',
      sort: { key: 'hands', direction: 'desc' },
    });

    expect(players.map((player) => player.uid)).toEqual([10720217, 10410931]);
  });

  it('keeps mode-specific display rules in the feature model', () => {
    expect(scoreLabelKey('10010101')).toBe('thronePoints');
    expect(scoreLabelKey('10050301')).toBe('championPoints');
    expect(
      snapshotDisplayLabel({ id: 'sample', label: 'Sample data' }, { sampleSnapshot: '示例数据' }),
    ).toBe('示例数据');
  });
});
