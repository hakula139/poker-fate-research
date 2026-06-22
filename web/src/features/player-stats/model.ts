import type { GameStats, GameTypeId, PlayerRecord } from '@/types';

import { tagSortValue } from './tagging';

export const HOLDEM_GAME_TYPE: GameTypeId = '10010101';
export const HOLDEM_GAME_TYPE_NUMERIC = Number(HOLDEM_GAME_TYPE);

export type SortKey =
  | 'name'
  | 'hands'
  | 'profit'
  | 'vpip'
  | 'pfr'
  | 'threeBet'
  | 'wtsd'
  | 'afq'
  | 'cbet'
  | 'tag'
  | 'updated';

export type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

export function getGameStats(player: PlayerRecord): GameStats | undefined {
  return player.games[HOLDEM_GAME_TYPE];
}

function sortValue(player: PlayerRecord, key: SortKey): string | number {
  const stats = getGameStats(player);
  if (key === 'name') {
    return player.name.toLowerCase();
  }
  if (key === 'updated') {
    return player.fetchedAt;
  }
  if (key === 'tag') {
    return tagSortValue(stats);
  }
  return stats?.[key] ?? Number.NEGATIVE_INFINITY;
}

function compareSortValues(
  leftValue: string | number,
  rightValue: string | number,
  direction: SortState['direction'],
): number {
  const order = direction === 'asc' ? 1 : -1;
  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * order;
  }
  return String(leftValue).localeCompare(String(rightValue)) * order;
}

export function playerMatchesQuery(player: PlayerRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return (
    !needle || player.name.toLowerCase().includes(needle) || String(player.uid).includes(needle)
  );
}

export function filterAndSortPlayers({
  players,
  query,
  sort,
}: {
  players: PlayerRecord[];
  query: string;
  sort: SortState;
}): PlayerRecord[] {
  return [...players.filter((player) => playerMatchesQuery(player, query))].sort((left, right) =>
    compareSortValues(sortValue(left, sort.key), sortValue(right, sort.key), sort.direction),
  );
}
