import { describe, expect, it } from 'vitest';

import worker from './index';

type AssetMap = Record<string, unknown>;

function createEnv(assets: AssetMap) {
  return {
    ASSETS: {
      connect() {
        throw new Error('Asset socket connections are not used in tests.');
      },
      fetch(input: RequestInfo | URL) {
        const url = new URL(input instanceof Request ? input.url : input);
        const asset = assets[url.pathname];
        if (asset === undefined) {
          return Promise.resolve(new Response(null, { status: 404 }));
        }
        return Promise.resolve(Response.json(asset));
      },
    },
  };
}

async function fetchJson(path: string, assets: AssetMap, init?: RequestInit) {
  type WorkerRequest = Parameters<typeof worker.fetch>[0];
  const request = new Request(`https://example.com${path}`, init) as WorkerRequest;
  const response = await worker.fetch(request, createEnv(assets));
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe('worker API', () => {
  it('returns the generated snapshot index', async () => {
    const index = {
      generatedAt: '2026-06-18T00:00:00Z',
      snapshots: [{ id: '2026-06-18', path: 'data/snapshots/2026-06-18.json' }],
    };

    const result = await fetchJson('/api/snapshots', { '/data/snapshots.json': index });

    expect(result).toEqual({ body: index, status: 200 });
  });

  it('returns a generated snapshot by id', async () => {
    const snapshot = { id: '2026-06-18', players: [] };
    const index = {
      snapshots: [{ id: '2026-06-18', path: 'data/snapshots/2026-06-18.json' }],
    };

    const result = await fetchJson('/api/snapshots/2026-06-18', {
      '/data/snapshots.json': index,
      '/data/snapshots/2026-06-18.json': snapshot,
    });

    expect(result).toEqual({ body: snapshot, status: 200 });
  });

  it('rejects unknown snapshot ids', async () => {
    const result = await fetchJson('/api/snapshots/missing', {
      '/data/snapshots.json': { snapshots: [] },
    });

    expect(result).toEqual({ body: { error: 'Snapshot not found' }, status: 404 });
  });

  it('rejects unsupported methods', async () => {
    const result = await fetchJson('/api/snapshots', {}, { method: 'POST' });

    expect(result).toEqual({ body: { error: 'Method not allowed' }, status: 405 });
  });
});
