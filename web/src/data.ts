import { sampleSnapshot } from './fixtures/sampleData';
import type { PlayerSnapshot, SnapshotIndex } from './types';

export async function loadSnapshots(): Promise<{
  index: SnapshotIndex;
  active: PlayerSnapshot;
}> {
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
    };
  } catch {
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
