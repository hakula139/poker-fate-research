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
type CommunityVoteFixture = {
  uid: number;
  tag: string;
  voterId: string;
};
type DbFixture = {
  players?: PlayerFixture[];
  communityVotes?: CommunityVoteFixture[];
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
  const votes = (fixture.communityVotes ?? []).map((vote) => ({
    tag: vote.tag,
    uid: vote.uid,
    voter_id: vote.voterId,
  }));
  const rateLimits = new Map<string, { count: number; window_start: string }>();
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
          if (query.includes('FROM community_tag_votes') && query.includes('GROUP BY uid, tag')) {
            const threshold = Number(values[values.length - 1]);
            const uidFilter = query.includes('WHERE uid IN (')
              ? new Set(values.slice(0, -1).map((value) => Number(value)))
              : null;
            const counts = new Map<string, number>();
            for (const vote of votes) {
              if (uidFilter && !uidFilter.has(vote.uid)) {
                continue;
              }
              const key = `${String(vote.uid)}|${vote.tag}`;
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return Promise.resolve({
              results: [...counts.entries()]
                .map(([key, count]) => {
                  const [uid, tag] = key.split('|');
                  return { count, tag, uid: Number(uid) };
                })
                .filter((row) => row.count >= threshold),
            });
          }
          if (query.includes('FROM community_tag_votes') && query.includes('GROUP BY tag')) {
            const voterId = String(values[0]);
            const uid = Number(values[1]);
            const tally = new Map<string, { count: number; mine: number }>();
            for (const vote of votes) {
              if (vote.uid !== uid) {
                continue;
              }
              const entry = tally.get(vote.tag) ?? { count: 0, mine: 0 };
              entry.count += 1;
              if (vote.voter_id === voterId) {
                entry.mine = 1;
              }
              tally.set(vote.tag, entry);
            }
            return Promise.resolve({
              results: [...tally.entries()].map(([tag, entry]) => ({
                count: entry.count,
                mine: entry.mine,
                tag,
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
          if (query.includes('FROM community_vote_rate_limits')) {
            const row = rateLimits.get(String(values[0]));
            return Promise.resolve(row ? { ...row } : null);
          }
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
          if (query.includes('INSERT INTO community_vote_rate_limits')) {
            const ipHash = String(values[0]);
            const windowStart = String(values[1]);
            const existing = rateLimits.get(ipHash);
            if (existing?.window_start === windowStart) {
              existing.count += 1;
            } else {
              rateLimits.set(ipHash, { count: 1, window_start: windowStart });
            }
            return Promise.resolve({});
          }
          if (query.includes('INSERT INTO community_tag_votes')) {
            const uid = Number(values[0]);
            const tag = String(values[1]);
            const voterId = String(values[2]);
            const exists = votes.some(
              (vote) => vote.uid === uid && vote.tag === tag && vote.voter_id === voterId,
            );
            if (!exists) {
              votes.push({ tag, uid, voter_id: voterId });
            }
            return Promise.resolve({});
          }
          if (query.includes('DELETE FROM community_tag_votes')) {
            const uid = Number(values[0]);
            const tag = String(values[1]);
            const voterId = String(values[2]);
            for (let index = votes.length - 1; index >= 0; index -= 1) {
              const vote = votes[index];
              if (vote.uid === uid && vote.tag === tag && vote.voter_id === voterId) {
                votes.splice(index, 1);
              }
            }
            return Promise.resolve({});
          }
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

function postVote(path: string, body: Record<string, unknown>, db?: WorkerEnv['DB']) {
  return fetchJson(path, {}, { body: JSON.stringify(body), method: 'POST' }, db);
}

describe('community tags', () => {
  type TagVote = { tag: string; count: number; mine: boolean };

  it('returns every preset tag with zero counts when there are no votes', async () => {
    const result = await fetchJson('/api/players/101/tags', {}, undefined, createDb({}));
    const body = result.body as { tags: TagVote[] };

    expect(result.status).toBe(200);
    expect(body.tags).toHaveLength(11);
    expect(body.tags.every((tag) => tag.count === 0 && !tag.mine)).toBe(true);
  });

  it('reports counts and flags the voter\u2019s own selection', async () => {
    const db = createDb({
      communityVotes: [
        { tag: 'Limper', uid: 101, voterId: 'me-voter-id' },
        { tag: 'Limper', uid: 101, voterId: 'other-voter-id' },
        { tag: 'Bluff-heavy', uid: 101, voterId: 'other-voter-id' },
      ],
    });
    const result = await fetchJson('/api/players/101/tags?voter=me-voter-id', {}, undefined, db);
    const body = result.body as { tags: TagVote[] };

    expect(body.tags.find((tag) => tag.tag === 'Limper')).toEqual({
      count: 2,
      mine: true,
      tag: 'Limper',
    });
    expect(body.tags.find((tag) => tag.tag === 'Bluff-heavy')).toEqual({
      count: 1,
      mine: false,
      tag: 'Bluff-heavy',
    });
  });

  it('adds a vote idempotently for the same voter and tag', async () => {
    const db = createDb({});
    const body = { action: 'add', tag: 'Limper', voterId: 'voter-1234' };

    await postVote('/api/players/101/tags', body, db);
    const result = await postVote('/api/players/101/tags', body, db);
    const payload = result.body as { tags: TagVote[] };

    expect(payload.tags.find((tag) => tag.tag === 'Limper')).toEqual({
      count: 1,
      mine: true,
      tag: 'Limper',
    });
  });

  it('removes the voter\u2019s vote on the remove action', async () => {
    const db = createDb({ communityVotes: [{ tag: 'Limper', uid: 101, voterId: 'voter-1234' }] });
    const result = await postVote(
      '/api/players/101/tags',
      { action: 'remove', tag: 'Limper', voterId: 'voter-1234' },
      db,
    );
    const payload = result.body as { tags: TagVote[] };

    expect(payload.tags.find((tag) => tag.tag === 'Limper')?.count).toBe(0);
  });

  it('rejects unknown community tags', async () => {
    const result = await postVote(
      '/api/players/101/tags',
      { action: 'add', tag: 'Not a preset', voterId: 'voter-1234' },
      createDb({}),
    );

    expect(result.status).toBe(400);
  });

  it('surfaces community tags on the player list at the threshold', async () => {
    const active = { games: { '10010101': { hands: 8229 } }, name: 'Active', uid: 101 };
    const communityVotes = Array.from({ length: 3 }, (_, index) => ({
      tag: 'Bluff-heavy',
      uid: 101,
      voterId: `voter-${String(index)}`,
    }));
    const result = await fetchJson(
      '/api/players',
      {},
      undefined,
      createDb({
        communityVotes,
        players: [
          { fetched_at: '2026-06-18T00:00:00Z', player_json: JSON.stringify(active), uid: 101 },
        ],
      }),
    );
    const body = result.body as {
      players: { communityTags?: { tag: string; count: number }[] }[];
    };

    expect(body.players[0].communityTags).toEqual([{ count: 3, tag: 'Bluff-heavy' }]);
  });

  it('keeps below-threshold community tags off the player list', async () => {
    const active = { games: { '10010101': { hands: 8229 } }, name: 'Active', uid: 101 };
    const communityVotes = Array.from({ length: 2 }, (_, index) => ({
      tag: 'Bluff-heavy',
      uid: 101,
      voterId: `voter-${String(index)}`,
    }));
    const result = await fetchJson(
      '/api/players',
      {},
      undefined,
      createDb({
        communityVotes,
        players: [
          { fetched_at: '2026-06-18T00:00:00Z', player_json: JSON.stringify(active), uid: 101 },
        ],
      }),
    );
    const body = result.body as { players: { communityTags?: unknown }[] };

    expect(body.players[0].communityTags).toBeUndefined();
  });

  it('rate-limits excessive voting from one client', async () => {
    const db = createDb({});
    for (let index = 0; index < 60; index += 1) {
      const ok = await postVote(
        '/api/players/101/tags',
        { action: 'add', tag: 'Limper', voterId: `community-voter-${String(index)}` },
        db,
      );
      expect(ok.status).toBe(200);
    }

    const limited = await postVote(
      '/api/players/101/tags',
      { action: 'add', tag: 'Limper', voterId: 'community-voter-final' },
      db,
    );

    expect(limited.status).toBe(429);
  });
});

describe('normalizeGame', () => {
  it('matches the shared official-game-data contract', () => {
    expect(
      normalizeGame(gameDataContract.gameType, gameDataContract.label, gameDataContract.raw),
    ).toEqual(gameDataContract.normalized);
  });
});
