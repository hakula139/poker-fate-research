import type { GameStats, GameTypeId, PlayerRecord } from '@/types';

import { tagSortValue } from './tagging';

export const gameTypeIds: GameTypeId[] = ['10010101', '10020101', '10050301'];

export type ScoreLabelKey = 'thronePoints' | 'championPoints';

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
  | 'tag';

export type SortState = {
  key: SortKey;
  direction: 'asc' | 'desc';
};

export function getGameStats(player: PlayerRecord, gameType: GameTypeId): GameStats | undefined {
  return player.games[gameType];
}

export function scoreLabelKey(gameType: GameTypeId): ScoreLabelKey {
  return gameType === '10050301' ? 'championPoints' : 'thronePoints';
}

function sortValue(player: PlayerRecord, gameType: GameTypeId, key: SortKey): string | number {
  const stats = getGameStats(player, gameType);
  if (key === 'name') {
    return player.name.toLowerCase();
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
  gameType,
  players,
  query,
  sort,
}: {
  gameType: GameTypeId;
  players: PlayerRecord[];
  query: string;
  sort: SortState;
}): PlayerRecord[] {
  return [...players.filter((player) => playerMatchesQuery(player, query))].sort((left, right) =>
    compareSortValues(
      sortValue(left, gameType, sort.key),
      sortValue(right, gameType, sort.key),
      sort.direction,
    ),
  );
}
