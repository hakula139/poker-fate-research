import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPlayers, mergePlayersByUid, refreshPlayer, searchPlayers } from './data';
import type { PlayerRecord } from './types';

const originalFetch = globalThis.fetch;

function playerRecord(uid: number, fetchedAt: string, name = `p${String(uid)}`): PlayerRecord {
  return {
    fetchedAt,
    games: {},
    leaderboardEntries: [],
    name,
    names: [name],
    sngRecordCount: 0,
    uid,
  };
}

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

describe('refreshPlayer', () => {
  it('returns the refreshed player from the Worker API', async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      expect(requestUrl(input)).toBe('/api/players/10410931');
      return Promise.resolve(
        Response.json({ player: { games: {}, name: 'Hakula', uid: 10410931 } }),
      );
    });

    await expect(refreshPlayer(10410931)).resolves.toEqual({
      games: {},
      name: 'Hakula',
      uid: 10410931,
    });
  });

  it('returns null when the player cannot be refreshed', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(Response.json({ player: null })));

    await expect(refreshPlayer(999)).resolves.toBeNull();
  });
});

describe('mergePlayersByUid', () => {
  it('keeps the record with the newer fetchedAt', () => {
    const merged = mergePlayersByUid(
      [playerRecord(1, '2026-06-01T00:00:00Z', 'old'), playerRecord(2, '2026-06-02T00:00:00Z')],
      [playerRecord(1, '2026-06-10T00:00:00Z', 'new')],
    );

    expect(merged.find((player) => player.uid === 1)?.name).toBe('new');
    expect(merged.map((player) => player.uid).sort()).toEqual([1, 2]);
  });

  it('keeps the primary record when the extra copy is older', () => {
    const merged = mergePlayersByUid(
      [playerRecord(1, '2026-06-10T00:00:00Z', 'new')],
      [playerRecord(1, '2026-06-01T00:00:00Z', 'old')],
    );

    expect(merged[0].name).toBe('new');
  });
});
