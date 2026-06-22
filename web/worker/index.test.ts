import { describe, expect, it } from 'vitest';

import gameDataContract from '../tests/fixtures/official-game-data.json';

import worker, { normalizeGame } from './index';

type AssetMap = Record<string, unknown>;
type WorkerEnv = Parameters<typeof worker.fetch>[1];
type DbFixture = {
  cachedPlayers?: CachedPlayerFixture[];
  players?: Record<string, SnapshotPlayerFixture[]>;
  snapshots?: SnapshotFixture[];
};
type CachedPlayerFixture = {
  alias: string;
  expires_at: string;
  fetched_at: string;
  player_json: string;
  uid: number;
};
type SnapshotFixture = {
  generated_at: string;
  id: string;
  label: string;
  player_count: number;
  source: string;
};
type SnapshotPlayerFixture = {
  fetched_at: string;
  leaderboard_entries_json: string;
  player_json: string;
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

function createDb(fixture: DbFixture): WorkerEnv['DB'] {
  const cachedPlayers = fixture.cachedPlayers ?? [];
  const snapshots = fixture.snapshots ?? [];
  const players = fixture.players ?? {};

  return {
    prepare(query: string) {
      let values: unknown[] = [];
      return {
        all() {
          if (query.includes('FROM snapshots') && query.includes('ORDER BY generated_at')) {
            return Promise.resolve({
              results: [...snapshots].sort((left, right) =>
                right.generated_at.localeCompare(left.generated_at),
              ),
            });
          }
          if (query.includes('FROM snapshot_players')) {
            const snapshotId = String(values[0]);
            return Promise.resolve({ results: players[snapshotId] ?? [] });
          }
          if (query.includes('FROM player_cache') && query.includes('expires_at >=')) {
            const now = String(values[0]);
            return Promise.resolve({
              results: cachedPlayers
                .filter((player) => player.expires_at >= now)
                .sort((left, right) => right.fetched_at.localeCompare(left.fetched_at))
                .map((player) => ({
                  alias: null,
                  expires_at: player.expires_at,
                  player_json: player.player_json,
                  uid: player.uid,
                })),
            });
          }
          if (query.includes('FROM player_cache')) {
            const exactQuery = String(values[0]);
            const likeQuery = String(values[1]).replaceAll('%', '').toLowerCase();
            return Promise.resolve({
              results: cachedPlayers
                .filter(
                  (player) =>
                    String(player.uid) === exactQuery ||
                    player.alias.toLowerCase().includes(likeQuery),
                )
                .sort((left, right) => right.fetched_at.localeCompare(left.fetched_at))
                .map((player) => ({
                  alias: player.alias,
                  expires_at: player.expires_at,
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
          if (query.includes('FROM snapshots') && query.includes('WHERE id = ?')) {
            const snapshotId = String(values[0]);
            return Promise.resolve(
              snapshots.find((snapshot) => snapshot.id === snapshotId) ?? null,
            );
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

describe('worker API', () => {
  it('returns an empty snapshot index when D1 has no snapshots', async () => {
    const result = await fetchJson('/api/snapshots', {});

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ snapshots: [] });
  });

  it('returns a D1 snapshot index when the database has snapshots', async () => {
    const result = await fetchJson(
      '/api/snapshots',
      {},
      undefined,
      createDb({
        snapshots: [
          {
            generated_at: '2026-06-17T00:00:00Z',
            id: '2026-06-17',
            label: 'Jun 17, 2026',
            player_count: 12,
            source: 'scheduled',
          },
          {
            generated_at: '2026-06-18T00:00:00Z',
            id: '2026-06-18',
            label: 'Jun 18, 2026',
            player_count: 16,
            source: 'scheduled',
          },
        ],
      }),
    );

    expect(result).toEqual({
      body: {
        generatedAt: '2026-06-18T00:00:00Z',
        snapshots: [
          {
            id: '2026-06-17',
            label: 'Jun 17, 2026',
            path: 'api/snapshots/2026-06-17',
            playerCount: 12,
            source: 'scheduled',
          },
          {
            id: '2026-06-18',
            label: 'Jun 18, 2026',
            path: 'api/snapshots/2026-06-18',
            playerCount: 16,
            source: 'scheduled',
          },
        ],
      },
      status: 200,
    });
  });

  it('returns a D1 snapshot by id when the database has players', async () => {
    const player = { games: {}, name: 'Player One', uid: 101 };
    const result = await fetchJson(
      '/api/snapshots/2026-06-18',
      {},
      undefined,
      createDb({
        players: {
          '2026-06-18': [
            {
              fetched_at: '2026-06-18T01:00:00Z',
              leaderboard_entries_json: JSON.stringify([{ rank: 1 }]),
              player_json: JSON.stringify(player),
            },
          ],
        },
        snapshots: [
          {
            generated_at: '2026-06-18T00:00:00Z',
            id: '2026-06-18',
            label: 'Jun 18, 2026',
            player_count: 1,
            source: 'scheduled',
          },
        ],
      }),
    );

    expect(result).toEqual({
      body: {
        generatedAt: '2026-06-18T00:00:00Z',
        id: '2026-06-18',
        label: 'Jun 18, 2026',
        players: [
          {
            fetchedAt: '2026-06-18T01:00:00Z',
            games: {},
            leaderboardEntries: [{ rank: 1 }],
            name: 'Player One',
            uid: 101,
          },
        ],
        source: 'scheduled',
      },
      status: 200,
    });
  });

  it('returns cached D1 players by alias search', async () => {
    const player = { games: {}, name: 'Hakula', uid: 10410931 };
    const result = await fetchJson(
      '/api/players/search?q=hakula',
      {},
      undefined,
      createDb({
        cachedPlayers: [
          {
            alias: 'Hakula',
            expires_at: '9999-06-19T01:00:00Z',
            fetched_at: '2026-06-18T01:00:00Z',
            player_json: JSON.stringify(player),
            uid: 10410931,
          },
        ],
      }),
    );

    expect(result).toEqual({ body: { players: [player] }, status: 200 });
  });

  it('returns unexpired cached D1 players for initial hydration', async () => {
    const player = { games: {}, name: 'Hakula', uid: 10410931 };
    const result = await fetchJson(
      '/api/players/cached',
      {},
      undefined,
      createDb({
        cachedPlayers: [
          {
            alias: 'Hakula',
            expires_at: '9999-06-19T01:00:00Z',
            fetched_at: '2026-06-18T01:00:00Z',
            player_json: JSON.stringify(player),
            uid: 10410931,
          },
        ],
      }),
    );

    expect(result).toEqual({ body: { players: [player] }, status: 200 });
  });

  it('rejects unknown snapshot ids', async () => {
    const result = await fetchJson('/api/snapshots/missing', {});

    expect(result).toEqual({ body: { error: 'Snapshot not found' }, status: 404 });
  });

  it('rejects unsupported methods', async () => {
    const result = await fetchJson('/api/snapshots', {}, { method: 'POST' });

    expect(result).toEqual({ body: { error: 'Method not allowed' }, status: 405 });
  });
});

describe('normalizeGame', () => {
  it('matches the shared official-game-data contract', () => {
    expect(
      normalizeGame(gameDataContract.gameType, gameDataContract.label, gameDataContract.raw),
    ).toEqual(gameDataContract.normalized);
  });
});
