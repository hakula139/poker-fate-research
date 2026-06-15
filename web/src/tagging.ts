import type { GameStats, PlayerTag } from './types';

const MIN_HANDS = 500;

export function ratePercent(rate: number): number {
  return rate / 100;
}

export function classifyPlayer(stats: GameStats | undefined): PlayerTag {
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

  if (vpip >= 35 && gap >= 18) {
    return 'Loose-passive';
  }

  if (vpip >= 28 && vpip < 40 && gap <= 12) {
    return 'LAG';
  }

  if (vpip >= 15 && vpip < 28 && gap <= 8) {
    return 'TAG';
  }

  return 'Unclassified';
}
