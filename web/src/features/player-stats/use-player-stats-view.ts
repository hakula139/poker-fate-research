import { useMemo, useState } from 'react';

import type { GameTypeId, PlayerRecord } from '@/types';

import { filterAndSortPlayers, type SortKey, type SortState } from './model';

export function usePlayerStatsView(players: PlayerRecord[]) {
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });

  const filteredPlayers = useMemo(() => {
    return filterAndSortPlayers({
      gameType,
      players,
      query,
      sort,
    });
  }, [gameType, players, query, sort]);

  const selectedPlayer = useMemo<PlayerRecord | undefined>(
    () => filteredPlayers.find((player) => player.uid === selectedUid) ?? filteredPlayers[0],
    [filteredPlayers, selectedUid],
  );

  function changeSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  }

  return {
    filteredPlayers,
    gameType,
    query,
    selectedPlayer,
    selectedUid,
    setGameType,
    setQuery,
    setSelectedUid,
    sort,
    changeSort,
  };
}
