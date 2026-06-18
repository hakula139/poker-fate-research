import { useEffect, useMemo, useState } from 'react';

import { searchPlayers } from '@/data';
import type { GameTypeId, PlayerRecord } from '@/types';

import { filterAndSortPlayers, type SortKey, type SortState } from './model';

export function usePlayerStatsView(players: PlayerRecord[]) {
  const [query, setQuery] = useState('');
  const [gameType, setGameType] = useState<GameTypeId>('10010101');
  const [lookupResult, setLookupResult] = useState<{
    players: PlayerRecord[];
    query: string;
  } | null>(null);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'profit', direction: 'desc' });

  const localFilteredPlayers = useMemo(() => {
    return filterAndSortPlayers({
      gameType,
      players,
      query,
      sort,
    });
  }, [gameType, players, query, sort]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || localFilteredPlayers.length > 0) {
      return;
    }

    const abortController = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPlayers(trimmedQuery)
        .then((nextPlayers) => {
          if (!abortController.signal.aborted) {
            setLookupResult({ players: nextPlayers, query: trimmedQuery });
          }
        })
        .catch(() => {
          if (!abortController.signal.aborted) {
            setLookupResult({ players: [], query: trimmedQuery });
          }
        });
    }, 300);

    return () => {
      abortController.abort();
      window.clearTimeout(timer);
    };
  }, [localFilteredPlayers.length, query]);

  const mergedPlayers = useMemo(() => {
    const playerByUid = new Map(players.map((player) => [player.uid, player]));
    const lookupPlayers = lookupResult?.query === query.trim() ? lookupResult.players : [];
    for (const player of lookupPlayers) {
      playerByUid.set(player.uid, playerByUid.get(player.uid) ?? player);
    }
    return [...playerByUid.values()];
  }, [lookupResult, players, query]);

  const filteredPlayers = useMemo(() => {
    return filterAndSortPlayers({
      gameType,
      players: mergedPlayers,
      query,
      sort,
    });
  }, [gameType, mergedPlayers, query, sort]);

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
