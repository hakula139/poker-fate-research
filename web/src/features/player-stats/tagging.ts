import type { GameStats, OverlayTag, PlayerTags, PostflopTag, PreflopTag } from '@/types';

const MIN_HANDS = 500;

export const preflopTagOrder: PreflopTag[] = [
  'Sample too low',
  'Nit',
  'Tight-passive',
  'TAG',
  'LAG',
  'Loose-balanced',
  'Loose-passive',
  'Maniac',
];

export const postflopTagOrder: PostflopTag[] = [
  'Sample too low',
  'Fit-or-fold',
  'Postflop passive',
  'Postflop balanced',
  'Postflop aggressor',
  'Showdown-heavy',
  'Showdown caller',
];

export const overlayTagOrder: OverlayTag[] = ['3-Bet pressure', 'Low 3-Bet', 'Low C-Bet'];

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
  const gap = vpip - pfr;

  if (vpip < 15) {
    return 'Nit';
  }

  if (vpip < 20) {
    return gap <= 8 ? 'TAG' : 'Tight-passive';
  }

  if (vpip >= 40 && pfr >= 25 && threeBet >= 10) {
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

  if (gap <= 10) {
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

  if (afq >= 40 || cbet >= 60) {
    return 'Postflop aggressor';
  }

  if (wtsd >= 33 && afq < 30) {
    return 'Showdown caller';
  }

  if (wtsd <= 25 && afq < 30 && cbet < 50) {
    return 'Fit-or-fold';
  }

  if (wtsd >= 33) {
    return 'Showdown-heavy';
  }

  if (afq < 30 && cbet < 50) {
    return 'Postflop passive';
  }

  return 'Postflop balanced';
}

export function classifyOverlays(stats: GameStats | undefined): OverlayTag[] {
  if (!stats || stats.hands < MIN_HANDS) {
    return [];
  }

  const threeBet = ratePercent(stats.threeBet);
  const cbet = ratePercent(stats.cbet);
  const tags: OverlayTag[] = [];

  if (threeBet >= 10) {
    tags.push('3-Bet pressure');
  } else if (threeBet < 4) {
    tags.push('Low 3-Bet');
  }

  if (cbet < 35) {
    tags.push('Low C-Bet');
  }

  return tags;
}

export function classifyPlayer(stats: GameStats | undefined): PlayerTags {
  return {
    preflop: classifyPreflop(stats),
    postflop: classifyPostflop(stats),
    overlays: classifyOverlays(stats),
  };
}

export function tagSortValue(stats: GameStats | undefined): number {
  const tags = classifyPlayer(stats);
  const preflopIndex = preflopTagOrder.indexOf(tags.preflop);
  const postflopIndex = postflopTagOrder.indexOf(tags.postflop);
  return preflopIndex * 100 + postflopIndex;
}
