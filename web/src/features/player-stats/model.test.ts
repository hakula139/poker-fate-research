import { describe, expect, it } from 'vitest';

import { sampleSnapshot } from '../../../tests/fixtures/sample-snapshot';

import { filterAndSortPlayers, getGameStats, HOLDEM_GAME_TYPE } from './model';

describe('player stats model', () => {
  it("exposes Texas Hold'em as the only supported game type", () => {
    expect(HOLDEM_GAME_TYPE).toBe('10010101');
  });

  it("filters by player UID and sorts by Hold'em stats", () => {
    const players = filterAndSortPlayers({
      players: sampleSnapshot.players,
      query: '10410931',
      sort: { key: 'profit', direction: 'desc' },
    });

    expect(players.map((player) => player.uid)).toEqual([10410931]);
    expect(getGameStats(players[0])?.profit).toBe(94114872);
  });

  it("sorts missing Hold'em stats after real stats in descending numeric sorts", () => {
    const playersWithMixedHoldemStats = [
      sampleSnapshot.players[0],
      {
        ...sampleSnapshot.players[1],
        games: {},
      },
    ];

    const players = filterAndSortPlayers({
      players: playersWithMixedHoldemStats,
      query: '',
      sort: { key: 'hands', direction: 'desc' },
    });

    expect(players.map((player) => player.uid)).toEqual([10410931, 10720217]);
  });
});
