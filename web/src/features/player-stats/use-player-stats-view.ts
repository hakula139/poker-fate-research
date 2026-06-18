import { useEffect, useMemo, useState } from 'react';

import { searchPlayers } from '@/data';
import type { GameTypeId, PlayerRecord } from '@/types';

import { filterAndSortPlayers, type SortKey, type SortState } from './model';

export function usePlayerStatsView(players: PlayerRecord[]) {
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [searchedPlayers, setSearchedPlayers] = useState<PlayerRecord[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });

  const loadedPlayers = useMemo(() => {
    const playerByUid = new Map(players.map((player) => [player.uid, player]));
    for (const player of searchedPlayers) {
      playerByUid.set(player.uid, playerByUid.get(player.uid) ?? player);
    }
    return [...playerByUid.values()];
  }, [players, searchedPlayers]);

  const filteredPlayers = useMemo(() => {
    return filterAndSortPlayers({
      gameType,
      players: loadedPlayers,
      query,
      sort,
    });
  }, [gameType, loadedPlayers, query, sort]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || filteredPlayers.length > 0) {
      return;
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPlayers(trimmedQuery)
        .then((nextPlayers) => {
          if (!abortController.signal.aborted) {
            if (nextPlayers.length === 0) {
              return;
            }
            setSearchedPlayers((currentPlayers) => {
              const playerByUid = new Map(currentPlayers.map((player) => [player.uid, player]));
              let changed = false;
              for (const player of nextPlayers) {
                if (!playerByUid.has(player.uid)) {
                  playerByUid.set(player.uid, player);
                  changed = true;
                }
              }
              return changed ? [...playerByUid.values()] : currentPlayers;
            });
          }
        })
        .catch(() => undefined);
    }, 300);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [filteredPlayers.length, query]);

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
    loadedPlayers,
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
