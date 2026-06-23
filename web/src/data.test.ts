import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPlayers, searchPlayers } from './data';

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

describe('loadPlayers', () => {
  it('reports unavailable data when the players endpoint cannot be loaded', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 404 })));

    const result = await loadPlayers();

    expect(result.error).toBe('unavailable');
    expect(result.players).toEqual([]);
    expect(result.updatedAt).toBe('');
  });

  it('reports invalid data when the players payload has an unexpected shape', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(Response.json({ players: [{ uid: 'nope' }] })));

    const result = await loadPlayers();

    expect(result.error).toBe('invalid');
    expect(result.players).toEqual([]);
  });

  it('loads the unified player dataset and update time', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(
        Response.json({
          players: [{ games: {}, name: 'Hakula', uid: 10410931 }],
          updatedAt: '2026-06-18T00:00:00Z',
        }),
      ),
    );

    const result = await loadPlayers();

    expect(result.error).toBeNull();
    expect(result.players.map((player) => player.uid)).toEqual([10410931]);
    expect(result.updatedAt).toBe('2026-06-18T00:00:00Z');
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
