import { useCallback, useEffect, useState } from 'react';

import {
  loadSnapshot,
  loadSnapshots,
  type SnapshotLoadErrorCode,
  snapshotLoadErrorCode,
} from '@/data';
import type { PlayerSnapshot, SnapshotIndex, SnapshotIndexItem } from '@/types';

export type DataIssue =
  | {
      code: SnapshotLoadErrorCode;
      kind: 'sampleFallback';
    }
  | {
      code: SnapshotLoadErrorCode;
      kind: 'snapshotSelection';
    };

export function useSnapshots() {
  const [snapshotIndex, setSnapshotIndex] = useState<SnapshotIndex | null>(null);
  const [snapshot, setSnapshot] = useState<PlayerSnapshot | null>(null);
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [dataIssue, setDataIssue] = useState<DataIssue | null>(null);

  useEffect(() => {
    void loadSnapshots().then(({ index, active, source, error }) => {
      setSnapshotIndex(index);
      setSnapshot(active);
      setSnapshotId(active.id);
      setDataIssue(source === 'sample' && error ? { kind: 'sampleFallback', code: error } : null);
    });
  }, []);

  const changeSnapshot = useCallback(async (item: SnapshotIndexItem) => {
    try {
      const next = await loadSnapshot(item.id);
      setSnapshot(next);
      setSnapshotId(next.id);
      setDataIssue(null);
    } catch (error) {
      setDataIssue({ kind: 'snapshotSelection', code: snapshotLoadErrorCode(error) });
    }
  }, []);

  return {
    changeSnapshot,
    dataIssue,
    loading: !snapshot || !snapshotIndex,
    snapshot,
    snapshotId,
    snapshotIndex,
  };
}
