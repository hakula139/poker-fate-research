import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSnapshots, searchPlayers } from './data';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) {
    return input.url;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input;
}

describe('loadSnapshots', () => {
  it('reports unavailable data when the snapshot index cannot be loaded', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 404 })));

    const result = await loadSnapshots();

    expect(result.error).toBe('indexUnavailable');
    expect(result.active.players).toEqual([]);
    expect(result.index.snapshots).toEqual([]);
  });

  it('reports unavailable data when the snapshot index has an invalid shape', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(Response.json({ generatedAt: '2026-06-12T08:50:28Z' })),
    );

    const result = await loadSnapshots();

    expect(result.error).toBe('indexInvalid');
    expect(result.active.players).toEqual([]);
    expect(result.index.snapshots).toEqual([]);
  });

  it('merges cached players into generated snapshots', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url === '/api/snapshots') {
        return Promise.resolve(
          Response.json({
            snapshots: [
              {
                id: 'latest',
                label: 'Latest',
                path: 'api/snapshots/latest',
                playerCount: 1,
                source: 'test',
              },
            ],
          }),
        );
      }
      if (url === '/api/snapshots/latest') {
        return Promise.resolve(
          Response.json({
            generatedAt: '2026-06-18T00:00:00Z',
            id: 'latest',
            label: 'Latest',
            players: [{ games: {}, name: 'Leaderboard', uid: 1 }],
            source: 'test',
          }),
        );
      }
      if (url === '/api/players/cached') {
        return Promise.resolve(
          Response.json({ players: [{ games: {}, name: 'Hakula', uid: 10410931 }] }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    const result = await loadSnapshots();

    expect(result.active.players.map((player) => player.uid)).toEqual([1, 10410931]);
  });
});

describe('searchPlayers', () => {
  it('loads searched players from the Worker API', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      expect(requestUrl(input)).toBe('/api/players/search?q=Hakula');
      return Promise.resolve(
        Response.json({ players: [{ games: {}, name: 'Hakula', uid: 10410931 }] }),
      );
    });

    await expect(searchPlayers('Hakula')).resolves.toEqual([
      { games: {}, name: 'Hakula', uid: 10410931 },
    ]);
  });
});
