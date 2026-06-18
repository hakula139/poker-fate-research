import type { PlayerSnapshot, SnapshotIndex } from './types';

export type SnapshotLoadErrorCode =
  | 'indexUnavailable'
  | 'indexInvalid'
  | 'indexEmpty'
  | 'snapshotUnavailable'
  | 'snapshotInvalid'
  | 'unknown';

export type SnapshotLoadResult = {
  index: SnapshotIndex;
  active: PlayerSnapshot;
  error: SnapshotLoadErrorCode | null;
};

const emptySnapshot: PlayerSnapshot = {
  id: '',
  label: '',
  source: 'd1',
  generatedAt: '',
  players: [],
};

class SnapshotLoadError extends Error {
  constructor(readonly code: SnapshotLoadErrorCode) {
    super(code);
  }
}

export function snapshotLoadErrorCode(error: unknown): SnapshotLoadErrorCode {
  return error instanceof SnapshotLoadError ? error.code : 'unknown';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertSnapshotIndex(value: unknown): asserts value is SnapshotIndex {
  if (!isRecord(value) || !Array.isArray(value.snapshots)) {
    throw new SnapshotLoadError('indexInvalid');
  }
  for (const item of value.snapshots) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      typeof item.source !== 'string' ||
      typeof item.path !== 'string' ||
      typeof item.playerCount !== 'number'
    ) {
      throw new SnapshotLoadError('indexInvalid');
    }
  }
}

function assertPlayerSnapshot(value: unknown): asserts value is PlayerSnapshot {
  if (!isRecord(value) || !Array.isArray(value.players)) {
    throw new SnapshotLoadError('snapshotInvalid');
  }
  assertPlayerRecords(value.players);
}

function assertPlayerRecords(value: unknown): asserts value is PlayerSnapshot['players'] {
  if (!Array.isArray(value)) {
    throw new SnapshotLoadError('snapshotInvalid');
  }
  for (const player of value) {
    if (
      !isRecord(player) ||
      typeof player.uid !== 'number' ||
      typeof player.name !== 'string' ||
      !isRecord(player.games)
    ) {
      throw new SnapshotLoadError('snapshotInvalid');
    }
  }
}

export function mergePlayersByUid(
  primary: PlayerSnapshot['players'],
  extra: PlayerSnapshot['players'],
): PlayerSnapshot['players'] {
  const byUid = new Map(primary.map((player) => [player.uid, player]));
  for (const player of extra) {
    byUid.set(player.uid, byUid.get(player.uid) ?? player);
  }
  return [...byUid.values()];
}

export async function loadSnapshots(): Promise<SnapshotLoadResult> {
  try {
    const indexResponse = await fetch('/api/snapshots');
    if (!indexResponse.ok) {
      throw new SnapshotLoadError('indexUnavailable');
    }
    const index = await indexResponse.json();
    assertSnapshotIndex(index);
    const latest = index.snapshots.at(-1);
    if (!latest) {
      throw new SnapshotLoadError('indexEmpty');
    }
    const snapshotResponse = await fetch(`/api/snapshots/${encodeURIComponent(latest.id)}`);
    if (!snapshotResponse.ok) {
      throw new SnapshotLoadError('snapshotUnavailable');
    }
    const active = await snapshotResponse.json();
    assertPlayerSnapshot(active);
    const cachedPlayers = await loadCachedPlayers();
    return {
      index,
      active: { ...active, players: mergePlayersByUid(active.players, cachedPlayers) },
      error: null,
    };
  } catch (error) {
    return {
      index: {
        generatedAt: '',
        snapshots: [],
      },
      active: emptySnapshot,
      error: snapshotLoadErrorCode(error),
    };
  }
}

export async function loadSnapshot(snapshotId: string): Promise<PlayerSnapshot> {
  if (!snapshotId) {
    throw new SnapshotLoadError('snapshotUnavailable');
  }
  const response = await fetch(`/api/snapshots/${encodeURIComponent(snapshotId)}`);
  if (!response.ok) {
    throw new SnapshotLoadError('snapshotUnavailable');
  }
  const snapshot = await response.json();
  assertPlayerSnapshot(snapshot);
  const cachedPlayers = await loadCachedPlayers();
  return { ...snapshot, players: mergePlayersByUid(snapshot.players, cachedPlayers) };
}

async function loadCachedPlayers(): Promise<PlayerSnapshot['players']> {
  try {
    const response = await fetch('/api/players/cached');
    if (!response.ok) {
      return [];
    }
    const value = await response.json();
    if (!isRecord(value)) {
      return [];
    }
    const players = value.players;
    assertPlayerRecords(players);
    return players;
  } catch {
    return [];
  }
}

export async function searchPlayers(query: string): Promise<PlayerSnapshot['players']> {
  const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new SnapshotLoadError('snapshotUnavailable');
  }
  const value = await response.json();
  if (!isRecord(value)) {
    throw new SnapshotLoadError('snapshotInvalid');
  }
  const players = value.players;
  assertPlayerRecords(players);
  return players;
}
