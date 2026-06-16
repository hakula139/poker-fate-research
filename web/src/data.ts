import { sampleSnapshot } from './fixtures/sampleData';
import type { PlayerSnapshot, SnapshotIndex } from './types';

export type SnapshotLoadSource = 'generated' | 'sample';

export type SnapshotLoadResult = {
  index: SnapshotIndex;
  active: PlayerSnapshot;
  source: SnapshotLoadSource;
  error: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown snapshot load error';
}

export async function loadSnapshots(): Promise<SnapshotLoadResult> {
  try {
    const indexResponse = await fetch('/data/snapshots.json');
    if (!indexResponse.ok) {
      throw new Error('snapshot index is unavailable');
    }
    const index = (await indexResponse.json()) as SnapshotIndex;
    const latest = index.snapshots.at(-1);
    if (!latest) {
      throw new Error('snapshot index is empty');
    }
    const snapshotResponse = await fetch(`/${latest.path}`);
    if (!snapshotResponse.ok) {
      throw new Error('snapshot data is unavailable');
    }
    return {
      index,
      active: (await snapshotResponse.json()) as PlayerSnapshot,
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
      error: errorMessage(error),
    };
  }
}

export async function loadSnapshot(path: string): Promise<PlayerSnapshot> {
  if (!path) {
    return sampleSnapshot;
  }
  const response = await fetch(`/${path}`);
  if (!response.ok) {
    throw new Error('snapshot data is unavailable');
  }
  return (await response.json()) as PlayerSnapshot;
}
