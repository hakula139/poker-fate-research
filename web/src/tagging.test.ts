import { describe, expect, it } from 'vitest';

import { classifyPlayer } from './tagging';
import type { GameStats } from './types';

function stats(overrides: Partial<GameStats>): GameStats {
  return {
    gameType: 10010101,
    label: "Hold'em lobby",
    score: 0,
    hands: 1000,
    winHands: 0,
    rounds: 0,
    winRounds: 0,
    tourRounds: 0,
    tourWinRounds: 0,
    tourProfit: 0,
    tourMaxProfit: 0,
    profit: 0,
    maxProfit: 0,
    vpip: 2500,
    pfr: 1800,
    threeBet: 500,
    wtsd: 3000,
    afq: 2200,
    cbet: 4000,
    ...overrides,
  };
}

describe('classifyPlayer', () => {
  it('requires a meaningful hand sample', () => {
    expect(classifyPlayer(stats({ hands: 499, vpip: 7000, pfr: 6000 }))).toBe(
      'Sample too low',
    );
  });

  it('labels very tight players as nits', () => {
    expect(classifyPlayer(stats({ vpip: 1400, pfr: 1000 }))).toBe('Nit');
  });

  it('labels tight aggressive ranges as TAG', () => {
    expect(classifyPlayer(stats({ vpip: 2400, pfr: 1900 }))).toBe('TAG');
  });

  it('labels loose aggressive ranges as LAG', () => {
    expect(classifyPlayer(stats({ vpip: 3400, pfr: 2600 }))).toBe('LAG');
  });

  it('labels wide VPIP and PFR gaps as loose-passive', () => {
    expect(classifyPlayer(stats({ vpip: 5200, pfr: 1800 }))).toBe('Loose-passive');
  });

  it('labels high loose aggression as maniac', () => {
    expect(
      classifyPlayer(stats({ vpip: 5200, pfr: 3100, threeBet: 1200, afq: 2700 })),
    ).toBe('Maniac');
  });
});
