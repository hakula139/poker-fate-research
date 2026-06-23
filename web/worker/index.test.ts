import { describe, expect, it } from 'vitest';

import gameDataContract from '../tests/fixtures/official-game-data.json';

import worker, { normalizeGame } from './index';

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

function createEnv(assets: AssetMap, db?: WorkerEnv['DB']): WorkerEnv {
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
          if (query.includes('SELECT player_json FROM players WHERE uid = ?')) {
            const uid = Number(values[0]);
            const player = players.find((candidate) => candidate.uid === uid);
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

async function fetchJson(path: string, assets: AssetMap, init?: RequestInit, db?: WorkerEnv['DB']) {
  type WorkerRequest = Parameters<typeof worker.fetch>[0];
  const request = new Request(`https://example.com${path}`, init) as WorkerRequest;
  const response = await worker.fetch(request, createEnv(assets, db));
  return {
    body: await response.json(),
    status: response.status,
  };
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
