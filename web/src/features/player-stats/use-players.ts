import { useEffect, useState } from 'react';

import { type DataLoadErrorCode, loadPlayers } from '@/data';
import type { PlayerRecord } from '@/types';

export type DataIssue = {
  code: DataLoadErrorCode;
};

export function usePlayers() {
  const [players, setPlayers] = useState<PlayerRecord[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [dataIssue, setDataIssue] = useState<DataIssue | null>(null);

  useEffect(() => {
    void loadPlayers().then((result) => {
      setPlayers(result.players);
      setUpdatedAt(result.updatedAt);
      setDataIssue(result.error ? { code: result.error } : null);
    });
  }, []);

  return {
    dataIssue,
    loading: players === null,
    players: players ?? [],
    updatedAt,
  };
}
