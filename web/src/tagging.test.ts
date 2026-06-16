import { describe, expect, it } from 'vitest';

import { classifyPlayer, classifyPostflop, classifyPreflop } from './tagging';
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

describe('classifyPreflop', () => {
  it('requires a meaningful hand sample', () => {
    expect(classifyPreflop(stats({ hands: 499, vpip: 7000, pfr: 6000 }))).toBe('Sample too low');
  });

  it('labels very tight players as nits', () => {
    expect(classifyPreflop(stats({ vpip: 1400, pfr: 1000 }))).toBe('Nit');
  });

  it('labels tight low-gap ranges as tight-balanced', () => {
    expect(classifyPreflop(stats({ vpip: 1800, pfr: 1300 }))).toBe('Tight-balanced');
  });

  it('labels standard tight aggressive ranges as TAG', () => {
    expect(classifyPreflop(stats({ vpip: 2400, pfr: 1600 }))).toBe('TAG');
  });

  it('labels tight ranges with wide raise gaps as tight-passive', () => {
    expect(classifyPreflop(stats({ vpip: 2400, pfr: 900 }))).toBe('Tight-passive');
  });

  it('labels loose aggressive ranges as LAG', () => {
    expect(classifyPreflop(stats({ vpip: 3400, pfr: 2600 }))).toBe('LAG');
  });

  it('labels loose ranges with medium gaps as loose-balanced', () => {
    expect(classifyPreflop(stats({ vpip: 3600, pfr: 2100 }))).toBe('Loose-balanced');
  });

  it('labels wide VPIP and PFR gaps as loose-passive', () => {
    expect(classifyPreflop(stats({ vpip: 5200, pfr: 1800 }))).toBe('Loose-passive');
  });

  it('labels high loose aggression as maniac', () => {
    expect(classifyPreflop(stats({ vpip: 5200, pfr: 3100, threeBet: 1200, afq: 2700 }))).toBe(
      'Maniac',
    );
  });

  it('labels very loose aggression below maniac thresholds as LAG', () => {
    expect(classifyPreflop(stats({ vpip: 4200, pfr: 2600, threeBet: 900, afq: 2700 }))).toBe('LAG');
  });
});

describe('classifyPostflop', () => {
  it('requires a meaningful hand sample', () => {
    expect(classifyPostflop(stats({ hands: 499, wtsd: 4500, afq: 3000 }))).toBe('Sample too low');
  });

  it('labels high AFq or C-Bet as postflop aggression', () => {
    expect(classifyPostflop(stats({ afq: 4000, cbet: 3600 }))).toBe('Postflop aggressor');
    expect(classifyPostflop(stats({ afq: 1600, cbet: 6000 }))).toBe('Postflop aggressor');
  });

  it('labels high-showdown low-aggression players as showdown callers', () => {
    expect(classifyPostflop(stats({ wtsd: 3300, afq: 2900, cbet: 3000 }))).toBe('Showdown caller');
  });

  it('labels low-aggression low-cbet players as fit-or-fold', () => {
    expect(classifyPostflop(stats({ wtsd: 2400, afq: 2900, cbet: 4900 }))).toBe('Fit-or-fold');
  });

  it('labels high-showdown players without caller shape as showdown-heavy', () => {
    expect(classifyPostflop(stats({ wtsd: 3300, afq: 3500, cbet: 4200 }))).toBe('Showdown-heavy');
  });

  it('labels below-normal aggression as postflop passive', () => {
    expect(classifyPostflop(stats({ wtsd: 3000, afq: 2900, cbet: 4900 }))).toBe('Postflop passive');
  });

  it('labels the normal 6-max cash middle as postflop balanced', () => {
    expect(classifyPostflop(stats({ wtsd: 3000, afq: 3900, cbet: 5500 }))).toBe(
      'Postflop balanced',
    );
  });
});

describe('classifyPlayer', () => {
  it('returns separate preflop and postflop tags', () => {
    expect(classifyPlayer(stats({ vpip: 3400, pfr: 2600, wtsd: 3300, afq: 3500 }))).toEqual({
      preflop: 'LAG',
      postflop: 'Showdown-heavy',
    });
  });
});
