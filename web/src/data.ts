import type { CommunityTag, CommunityTagVote, PlayerDataset, PlayerRecord } from './types';

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

function isPlayerRecord(value: unknown): value is PlayerRecord {
  return (
    isRecord(value) &&
    typeof value.uid === 'number' &&
    typeof value.name === 'string' &&
    isRecord(value.games)
  );
}

function assertPlayerRecords(value: unknown): asserts value is PlayerRecord[] {
  if (!Array.isArray(value) || !value.every(isPlayerRecord)) {
    throw new DataLoadError('invalid');
  }
}

export function mergePlayersByUid(primary: PlayerRecord[], extra: PlayerRecord[]): PlayerRecord[] {
  const byUid = new Map(primary.map((player) => [player.uid, player]));
  for (const player of extra) {
    const existing = byUid.get(player.uid);
    if (!existing || player.fetchedAt > existing.fetchedAt) {
      byUid.set(player.uid, player);
    }
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

function assertCommunityTagVotes(value: unknown): asserts value is CommunityTagVote[] {
  if (!Array.isArray(value)) {
    throw new DataLoadError('invalid');
  }
}

export async function fetchCommunityTags(
  uid: number,
  voterId: string,
): Promise<CommunityTagVote[]> {
  const response = await fetch(
    `/api/players/${String(uid)}/tags?voter=${encodeURIComponent(voterId)}`,
  );
  if (!response.ok) {
    throw new DataLoadError('unavailable');
  }
  const value = await response.json();
  if (!isRecord(value)) {
    throw new DataLoadError('invalid');
  }
  assertCommunityTagVotes(value.tags);
  return value.tags;
}

export async function voteCommunityTag(
  uid: number,
  tag: CommunityTag,
  voterId: string,
  action: 'add' | 'remove',
): Promise<CommunityTagVote[]> {
  const response = await fetch(`/api/players/${String(uid)}/tags`, {
    body: JSON.stringify({ action, tag, voterId }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new DataLoadError('unavailable');
  }
  const value = await response.json();
  if (!isRecord(value)) {
    throw new DataLoadError('invalid');
  }
  assertCommunityTagVotes(value.tags);
  return value.tags;
}

export async function refreshPlayer(uid: number): Promise<PlayerRecord | null> {
  const response = await fetch(`/api/players/${String(uid)}`);
  if (!response.ok) {
    throw new DataLoadError('unavailable');
  }
  const value = await response.json();
  if (!isRecord(value)) {
    throw new DataLoadError('invalid');
  }
  if (value.player == null) {
    return null;
  }
  if (!isPlayerRecord(value.player)) {
    throw new DataLoadError('invalid');
  }
  return value.player;
}
