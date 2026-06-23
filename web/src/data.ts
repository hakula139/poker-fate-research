import type { PlayerDataset, PlayerRecord } from './types';

export type DataLoadErrorCode = 'unavailable' | 'invalid' | 'unknown';

export type PlayersLoadResult = PlayerDataset & {
  error: DataLoadErrorCode | null;
};

class DataLoadError extends Error {
  constructor(readonly code: DataLoadErrorCode) {
    super(code);
  }
}

export function dataLoadErrorCode(error: unknown): DataLoadErrorCode {
  return error instanceof DataLoadError ? error.code : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertPlayerRecords(value: unknown): asserts value is PlayerRecord[] {
  if (!Array.isArray(value)) {
    throw new DataLoadError('invalid');
  }
  for (const player of value) {
    if (
      !isRecord(player) ||
      typeof player.uid !== 'number' ||
      typeof player.name !== 'string' ||
      !isRecord(player.games)
    ) {
      throw new DataLoadError('invalid');
    }
  }
}

export function mergePlayersByUid(primary: PlayerRecord[], extra: PlayerRecord[]): PlayerRecord[] {
  const byUid = new Map(primary.map((player) => [player.uid, player]));
  for (const player of extra) {
    byUid.set(player.uid, byUid.get(player.uid) ?? player);
  }
  return [...byUid.values()];
}

export async function loadPlayers(): Promise<PlayersLoadResult> {
  try {
    const response = await fetch('/api/players');
    if (!response.ok) {
      throw new DataLoadError('unavailable');
    }
    const value = await response.json();
    if (!isRecord(value)) {
      throw new DataLoadError('invalid');
    }
    assertPlayerRecords(value.players);
    return {
      players: value.players,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
      error: null,
    };
  } catch (error) {
    return { players: [], updatedAt: '', error: dataLoadErrorCode(error) };
  }
}

export async function searchPlayers(query: string): Promise<PlayerRecord[]> {
  const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new DataLoadError('unavailable');
  }
  const value = await response.json();
  if (!isRecord(value)) {
    throw new DataLoadError('invalid');
  }
  assertPlayerRecords(value.players);
  return value.players;
}
