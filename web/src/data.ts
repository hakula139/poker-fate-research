import { sampleSnapshot } from './fixtures/sampleData';
import type { PlayerSnapshot, SnapshotIndex } from './types';

export type SnapshotLoadSource = 'generated' | 'sample';
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
  source: SnapshotLoadSource;
  error: SnapshotLoadErrorCode | null;
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
  for (const player of value.players) {
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

export async function loadSnapshots(): Promise<SnapshotLoadResult> {
  try {
    const indexResponse = await fetch('/data/snapshots.json');
    if (!indexResponse.ok) {
      throw new SnapshotLoadError('indexUnavailable');
    }
    const index = (await indexResponse.json()) as unknown;
    assertSnapshotIndex(index);
    const latest = index.snapshots.at(-1);
    if (!latest) {
      throw new SnapshotLoadError('indexEmpty');
    }
    const snapshotResponse = await fetch(`/${latest.path}`);
    if (!snapshotResponse.ok) {
      throw new SnapshotLoadError('snapshotUnavailable');
    }
    const active = (await snapshotResponse.json()) as unknown;
    assertPlayerSnapshot(active);
    return {
      index,
      active,
      source: 'generated',
      error: null,
    };
  } catch (error) {
    return {
      index: {
        generatedAt: sampleSnapshot.generatedAt,
        snapshots: [
          {
            id: sampleSnapshot.id,
            label: sampleSnapshot.label,
            playerCount: sampleSnapshot.players.length,
            source: sampleSnapshot.source,
            path: '',
          },
        ],
      },
      active: sampleSnapshot,
      source: 'sample',
      error: snapshotLoadErrorCode(error),
    };
  }
}

export async function loadSnapshot(path: string): Promise<PlayerSnapshot> {
  if (!path) {
    return sampleSnapshot;
  }
  const response = await fetch(`/${path}`);
  if (!response.ok) {
    throw new SnapshotLoadError('snapshotUnavailable');
  }
  const snapshot = (await response.json()) as unknown;
  assertPlayerSnapshot(snapshot);
  return snapshot;
}
