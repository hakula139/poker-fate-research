import { afterEach, describe, expect, it, vi } from 'vitest';

import gameDataContract from '../tests/fixtures/official-game-data.json';

import worker, { normalizeGame } from './index';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

type AssetMap = Record<string, unknown>;
type WorkerEnv = Parameters<typeof worker.fetch>[1];
type PlayerFixture = {
  alias?: string;
  fetched_at: string;
  player_json: string;
  uid: number;
};
type DbFixture = {
  players?: PlayerFixture[];
};

function createEnv(assets: AssetMap, db?: WorkerEnv['DB'], deviceToken?: string): WorkerEnv {
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
    DB: db,
    POKER_FATE_RESEARCH_DEVICE_TOKEN: deviceToken,
  };
}

function holdemHands(playerJson: string): number {
  const player = JSON.parse(playerJson) as { games?: Record<string, { hands?: number }> };
  return player.games?.['10010101']?.hands ?? 0;
}

function createDb(fixture: DbFixture): WorkerEnv['DB'] {
  const players = fixture.players ?? [];
  const byRecency = (left: PlayerFixture, right: PlayerFixture) =>
    right.fetched_at.localeCompare(left.fetched_at);

  return {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        all() {
          if (query.includes('FROM players') && query.includes('json_extract')) {
            return Promise.resolve({
              results: players
                .filter((player) => holdemHands(player.player_json) > 0)
                .sort(byRecency)
                .map((player) => ({
                  fetched_at: player.fetched_at,
                  player_json: player.player_json,
                  uid: player.uid,
                })),
            });
          }
          if (query.includes('FROM players') && query.includes('LEFT JOIN player_aliases')) {
            const exactQuery = String(values[0]);
            const likeQuery = String(values[1]).replaceAll('%', '').toLowerCase();
            return Promise.resolve({
              results: players
                .filter(
                  (player) =>
                    String(player.uid) === exactQuery ||
                    (player.alias?.toLowerCase().includes(likeQuery) ?? false),
                )
                .sort(byRecency)
                .map((player) => ({
                  alias: player.alias ?? null,
                  fetched_at: player.fetched_at,
                  player_json: player.player_json,
                  uid: player.uid,
                })),
            });
          }
          throw new Error(`Unexpected D1 all query: ${query}`);
        },
        bind(...nextValues: unknown[]) {
          values = nextValues;
          return this;
        },
        first() {
          const uid = Number(values[0]);
          const player = players.find((candidate) => candidate.uid === uid);
          if (query.includes('SELECT player_json, fetched_at FROM players WHERE uid = ?')) {
            return Promise.resolve(
              player ? { fetched_at: player.fetched_at, player_json: player.player_json } : null,
            );
          }
          if (query.includes('SELECT player_json FROM players WHERE uid = ?')) {
            return Promise.resolve(player ? { player_json: player.player_json } : null);
          }
          throw new Error(`Unexpected D1 first query: ${query}`);
        },
        run() {
          return Promise.resolve({});
        },
      };
    },
  } as WorkerEnv['DB'];
}

async function fetchJson(
  path: string,
  assets: AssetMap,
  init?: RequestInit,
  db?: WorkerEnv['DB'],
  deviceToken?: string,
) {
  type WorkerRequest = Parameters<typeof worker.fetch>[0];
  const request = new Request(`https://example.com${path}`, init) as WorkerRequest;
  const response = await worker.fetch(request, createEnv(assets, db, deviceToken));
  return {
    body: await response.json(),
    status: response.status,
  };
}

function mockOfficialApi(gameData: Record<string, unknown>) {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith('/login')) {
      return Promise.resolve(Response.json({ authorization: 'jwt-token', code: 0 }));
    }
    if (url.endsWith('/player/gameData')) {
      return Promise.resolve(Response.json({ code: 0, data: gameData }));
    }
    if (url.endsWith('/player/sngRecord')) {
      return Promise.resolve(Response.json({ code: 0, list: [] }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  });
}

function recentIso(): string {
  return new Date(Date.now() - 60_000).toISOString();
}

describe('worker API', () => {
  it('returns an empty players response when D1 is unavailable', async () => {
    const result = await fetchJson('/api/players', {});

    expect(result).toEqual({ body: { players: [], updatedAt: '' }, status: 200 });
  });

  it('lists players with Hold\u2019em hands and reports the latest update time', async () => {
    const active = { games: { '10010101': { hands: 8229 } }, name: 'Active', uid: 101 };
    const empty = { games: { '10010101': { hands: 0 } }, name: 'Empty', uid: 202 };
    const result = await fetchJson(
      '/api/players',
      {},
      undefined,
      createDb({
        players: [
          { fetched_at: '2026-06-18T00:00:00Z', player_json: JSON.stringify(active), uid: 101 },
          { fetched_at: '2026-06-17T00:00:00Z', player_json: JSON.stringify(empty), uid: 202 },
        ],
      }),
    );

    expect(result).toEqual({
      body: { players: [active], updatedAt: '2026-06-18T00:00:00Z' },
      status: 200,
    });
  });

  it('returns fresh cached players by alias search', async () => {
    const player = { games: { '10010101': { hands: 8229 } }, name: 'Hakula', uid: 10410931 };
    const result = await fetchJson(
      '/api/players/search?q=hakula',
      {},
      undefined,
      createDb({
        players: [
          {
            alias: 'Hakula',
            fetched_at: recentIso(),
            player_json: JSON.stringify(player),
            uid: 10410931,
          },
        ],
      }),
    );

    expect(result).toEqual({ body: { players: [player] }, status: 200 });
  });

  it('omits cached players without Hold\u2019em hands from search results', async () => {
    const player = { games: { '10010101': { hands: 0 } }, name: 'Empty', uid: 555 };
    const result = await fetchJson(
      '/api/players/search?q=empty',
      {},
      undefined,
      createDb({
        players: [
          {
            alias: 'Empty',
            fetched_at: recentIso(),
            player_json: JSON.stringify(player),
            uid: 555,
          },
        ],
      }),
    );

    expect(result).toEqual({ body: { players: [] }, status: 200 });
  });

  it('returns a fresh cached player on refresh without calling the official API', async () => {
    const fetchedAt = recentIso();
    const player = {
      fetchedAt,
      games: { '10010101': { hands: 8229 } },
      name: 'Hakula',
      uid: 10410931,
    };
    const fetchSpy = vi.fn(() => Promise.reject(new Error('official API must not be called')));
    globalThis.fetch = fetchSpy;

    const result = await fetchJson(
      '/api/players/10410931',
      {},
      undefined,
      createDb({
        players: [{ fetched_at: fetchedAt, player_json: JSON.stringify(player), uid: 10410931 }],
      }),
    );

    expect(result).toEqual({ body: { player }, status: 200 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refreshes a stale player from the official API', async () => {
    const staleAt = '2026-06-01T00:00:00Z';
    const cached = {
      fetchedAt: staleAt,
      games: { '10010101': { hands: 10 } },
      leaderboardEntries: [],
      name: 'Hakula',
      names: ['Hakula'],
      uid: 10410931,
    };
    mockOfficialApi({ fire_power: 42, play_times: 9999, profit: 100 });

    const result = await fetchJson(
      '/api/players/10410931',
      {},
      undefined,
      createDb({
        players: [{ fetched_at: staleAt, player_json: JSON.stringify(cached), uid: 10410931 }],
      }),
      'device-token',
    );

    const body = result.body as {
      player: { games: Record<string, { hands: number }>; name: string; uid: number };
    };
    expect(result.status).toBe(200);
    expect(body.player.uid).toBe(10410931);
    expect(body.player.name).toBe('Hakula');
    expect(body.player.games['10010101'].hands).toBe(9999);
  });

  it('returns a null player on refresh when the refreshed player has no Hold\u2019em hands', async () => {
    const staleAt = '2026-06-01T00:00:00Z';
    const cached = {
      fetchedAt: staleAt,
      games: { '10010101': { hands: 10 } },
      name: 'Empty',
      names: ['Empty'],
      uid: 555,
    };
    mockOfficialApi({ play_times: 0 });

    const result = await fetchJson(
      '/api/players/555',
      {},
      undefined,
      createDb({
        players: [{ fetched_at: staleAt, player_json: JSON.stringify(cached), uid: 555 }],
      }),
      'device-token',
    );

    expect(result).toEqual({ body: { player: null }, status: 200 });
  });

  it('returns a null player on refresh when D1 is unavailable', async () => {
    const result = await fetchJson('/api/players/123', {});

    expect(result).toEqual({ body: { player: null }, status: 200 });
  });

  it('rejects unsupported methods', async () => {
    const result = await fetchJson('/api/players', {}, { method: 'POST' });

    expect(result).toEqual({ body: { error: 'Method not allowed' }, status: 405 });
  });

  it('rejects unknown routes', async () => {
    const result = await fetchJson('/api/missing', {});

    expect(result).toEqual({ body: { error: 'Not found' }, status: 404 });
  });
});

describe('normalizeGame', () => {
  it('matches the shared official-game-data contract', () => {
    expect(
      normalizeGame(gameDataContract.gameType, gameDataContract.label, gameDataContract.raw),
    ).toEqual(gameDataContract.normalized);
  });
});
