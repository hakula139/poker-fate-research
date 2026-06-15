import type { GameStats, PlayerTags, PostflopTag, PreflopTag } from './types';

const MIN_HANDS = 500;

export function ratePercent(rate: number): number {
  return rate / 100;
}

export function classifyPreflop(stats: GameStats | undefined): PreflopTag {
  if (!stats || stats.hands < MIN_HANDS) {
    return 'Sample too low';
  }

  const vpip = ratePercent(stats.vpip);
  const pfr = ratePercent(stats.pfr);
  const threeBet = ratePercent(stats.threeBet);
  const afq = ratePercent(stats.afq);
  const gap = vpip - pfr;

  if (vpip < 15) {
    return 'Nit';
  }

  if (vpip >= 40 && pfr >= 25 && (threeBet >= 10 || afq >= 30)) {
    return 'Maniac';
  }

  if (vpip >= 40 && pfr >= 25) {
    return 'LAG';
  }

  if (vpip >= 28 && gap >= 18) {
    return 'Loose-passive';
  }

  if (vpip >= 28 && gap > 12) {
    return 'Loose-balanced';
  }

  if (vpip >= 28) {
    return 'LAG';
  }

  if (gap <= 12) {
    return 'TAG';
  }

  return 'Tight-passive';
}

export function classifyPostflop(stats: GameStats | undefined): PostflopTag {
  if (!stats || stats.hands < MIN_HANDS) {
    return 'Sample too low';
  }

  const wtsd = ratePercent(stats.wtsd);
  const afq = ratePercent(stats.afq);
  const cbet = ratePercent(stats.cbet);

  if (afq >= 28 || cbet >= 55) {
    return 'Postflop aggressor';
  }

  if (wtsd >= 38 && afq < 20) {
    return 'Showdown caller';
  }

  if (afq < 14 && cbet < 35) {
    return 'Fit-or-fold';
  }

  if (wtsd >= 38) {
    return 'Showdown-heavy';
  }

  return 'Postflop balanced';
}

export function classifyPlayer(stats: GameStats | undefined): PlayerTags {
  return {
    preflop: classifyPreflop(stats),
    postflop: classifyPostflop(stats),
  };
}
