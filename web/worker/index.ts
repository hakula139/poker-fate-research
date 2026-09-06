import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { communityTags, communityTagThreshold } from '../src/features/player-stats/community-tags';
import { HOLDEM_GAME_TYPE } from '../src/features/player-stats/model';
import type { CommunityTag, CommunityTagCount, CommunityTagVote } from '../src/types';

const playerLimit = 1000;
const searchResultLimit = 20;
const holdemHandsPath = `$.games."${HOLDEM_GAME_TYPE}".hands`;

const communityVoteRateLimitPerHour = 60;
const communityVoteSalt = 'poker-fate.community-vote';
const communityTagSet = new Set<string>(communityTags);

type Env = {
  ASSETS: Fetcher;
  DB?: Database;
};

type Database = {
  prepare(query: string): DatabaseStatement;
};

type DatabaseResult<Row> = {
  results?: Row[];
};

type DatabaseStatement = {
  all<Row>(): Promise<DatabaseResult<Row>>;
  bind(...values: unknown[]): DatabaseStatement;
  first<Row>(): Promise<Row | null>;
  run(): Promise<unknown>;
};

type PlayerRow = {
  fetched_at: string;
  player_json: string;
  uid: number;
};

type CachedPlayerRow = {
  alias: string | null;
  fetched_at: string;
  player_json: string;
  uid: number;
};

type PlayersResponse = {
  players: unknown[];
  updatedAt: string;
};

type CommunityCountRow = {
  uid: number;
  tag: string;
  count: number;
};

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function isoNow(): string {
  return new Date().toISOString();
}

function jsonResponse(value: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return Response.json(value, { ...init, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStoredJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ApiError(502, 'Stored player data has an invalid shape.');
  }
}

function parseStoredPlayer(value: string): Record<string, unknown> {
  const player = parseStoredJson(value);
  if (!isRecord(player)) {
    throw new ApiError(502, 'Stored player data has an invalid shape.');
  }
  return player;
}

function jsonInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function jsonString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function holdemHands(player: unknown): number {
  const games = jsonRecord(jsonRecord(player).games);
  return jsonInt(jsonRecord(games[HOLDEM_GAME_TYPE]).hands);
}

function hasHoldemHands(player: unknown): boolean {
  return holdemHands(player) > 0;
}

function uniqueCachedPlayers(rows: CachedPlayerRow[]): CachedPlayerRow[] {
  const players = new Map<number, CachedPlayerRow>();
  for (const row of rows) {
    if (!players.has(row.uid)) {
      players.set(row.uid, row);
    }
  }
  return [...players.values()];
}

function cachedRowsToPlayers(rows: CachedPlayerRow[]): unknown[] {
  return uniqueCachedPlayers(rows)
    .map((row) => parseStoredPlayer(row.player_json))
    .filter((player) => hasHoldemHands(player));
}

async function listD1Players(env: Env): Promise<PlayersResponse> {
  if (!env.DB) {
    return { players: [], updatedAt: '' };
  }

  const { results = [] } = await env.DB.prepare(
    `
    SELECT uid, player_json, fetched_at
    FROM players
    WHERE COALESCE(json_extract(player_json, '${holdemHandsPath}'), 0) > 0
    ORDER BY fetched_at DESC
    LIMIT ?
    `,
  )
    .bind(playerLimit)
    .all<PlayerRow>();

  const players = results.map((row) => parseStoredPlayer(row.player_json));
  attachCommunityTags(players, await communityTagCountsAll(env));

  return {
    players,
    updatedAt: results[0]?.fetched_at ?? '',
  };
}

async function searchD1CachedPlayerRows(env: Env, query: string): Promise<CachedPlayerRow[]> {
  const trimmedQuery = query.trim();
  if (!env.DB || trimmedQuery.length < 2) {
    return [];
  }

  const { results = [] } = await env.DB.prepare(
    `
    SELECT
      players.uid,
      players.player_json,
      players.fetched_at,
      player_aliases.alias
    FROM players
    LEFT JOIN player_aliases ON player_aliases.uid = players.uid
    WHERE CAST(players.uid AS TEXT) = ?
      OR player_aliases.alias LIKE ?
    ORDER BY players.fetched_at DESC
    LIMIT ?
    `,
  )
    .bind(trimmedQuery, `%${trimmedQuery}%`, searchResultLimit)
    .all<CachedPlayerRow>();

  return results;
}

function currentHourWindow(): string {
  return isoNow().slice(0, 13);
}

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8ToBytes(ip + communityVoteSalt));
  return bytesToHex(new Uint8Array(digest));
}

async function withinRateLimit(env: Env, ip: string): Promise<boolean> {
  if (!env.DB) {
    return false;
  }

  const ipHash = await hashIp(ip);
  const windowStart = currentHourWindow();
  const existing = await env.DB.prepare(
    'SELECT count, window_start FROM community_vote_rate_limits WHERE ip_hash = ?',
  )
    .bind(ipHash)
    .first<{ count: number; window_start: string }>();

  const count = existing?.window_start === windowStart ? existing.count : 0;
  if (count >= communityVoteRateLimitPerHour) {
    return false;
  }

  await env.DB.prepare(
    `
    INSERT INTO community_vote_rate_limits (ip_hash, window_start, count)
    VALUES (?, ?, 1)
    ON CONFLICT(ip_hash) DO UPDATE SET
      count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
      window_start = excluded.window_start
    `,
  )
    .bind(ipHash, windowStart)
    .run();
  return true;
}

function groupCommunityCounts(rows: CommunityCountRow[]): Map<number, CommunityTagCount[]> {
  const map = new Map<number, CommunityTagCount[]>();
  for (const row of rows) {
    const list = map.get(row.uid) ?? [];
    // Stored tags are constrained to the preset list on insert, so the raw
    // D1 string is a valid CommunityTag at this DB→domain boundary.
    list.push({ count: row.count, tag: row.tag as CommunityTag });
    map.set(row.uid, list);
  }
  return map;
}

async function communityTagCountsAll(env: Env): Promise<Map<number, CommunityTagCount[]>> {
  if (!env.DB) {
    return new Map();
  }

  const { results = [] } = await env.DB.prepare(
    `
    SELECT uid, tag, COUNT(*) AS count
    FROM community_tag_votes
    GROUP BY uid, tag
    HAVING COUNT(*) >= ?
    ORDER BY uid, count DESC
    `,
  )
    .bind(communityTagThreshold)
    .all<CommunityCountRow>();
  return groupCommunityCounts(results);
}

async function communityTagCountsForUids(
  env: Env,
  uids: number[],
): Promise<Map<number, CommunityTagCount[]>> {
  if (!env.DB || uids.length === 0) {
    return new Map();
  }

  const placeholders = uids.map(() => '?').join(', ');
  const { results = [] } = await env.DB.prepare(
    `
    SELECT uid, tag, COUNT(*) AS count
    FROM community_tag_votes
    WHERE uid IN (${placeholders})
    GROUP BY uid, tag
    HAVING COUNT(*) >= ?
    ORDER BY uid, count DESC
    `,
  )
    .bind(...uids, communityTagThreshold)
    .all<CommunityCountRow>();
  return groupCommunityCounts(results);
}

function attachCommunityTags(players: unknown[], counts: Map<number, CommunityTagCount[]>): void {
  for (const player of players) {
    if (!isRecord(player)) {
      continue;
    }
    const tags = counts.get(jsonInt(player.uid));
    if (tags?.length) {
      player.communityTags = tags;
    }
  }
}

async function enrichWithCommunityTags(env: Env, players: unknown[]): Promise<void> {
  const uids = players.flatMap((player) => (isRecord(player) ? [jsonInt(player.uid)] : []));
  const uniqueUids = [...new Set(uids.filter((uid) => uid > 0))];
  if (uniqueUids.length === 0) {
    return;
  }
  attachCommunityTags(players, await communityTagCountsForUids(env, uniqueUids));
}

async function listCommunityTags(
  env: Env,
  uid: number,
  voterId: string,
): Promise<CommunityTagVote[]> {
  if (!env.DB || uid <= 0) {
    return communityTags.map((tag) => ({ count: 0, mine: false, tag }));
  }

  const { results = [] } = await env.DB.prepare(
    `
    SELECT tag, COUNT(*) AS count, MAX(CASE WHEN voter_id = ? THEN 1 ELSE 0 END) AS mine
    FROM community_tag_votes
    WHERE uid = ?
    GROUP BY tag
    `,
  )
    .bind(voterId, uid)
    .all<{ tag: string; count: number; mine: number }>();

  const byTag = new Map(results.map((row) => [row.tag, row]));
  return communityTags.map((tag) => {
    const row = byTag.get(tag);
    return { count: row?.count ?? 0, mine: (row?.mine ?? 0) === 1, tag };
  });
}

async function submitCommunityTagVote(
  env: Env,
  request: Request,
  uid: number,
): Promise<{ tags: CommunityTagVote[] }> {
  if (!env.DB) {
    throw new ApiError(503, 'Community tagging is not configured.');
  }
  if (uid <= 0) {
    throw new ApiError(400, 'Invalid player id.');
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
  if (!isRecord(payload)) {
    throw new ApiError(400, 'Invalid JSON body.');
  }

  const tag = jsonString(payload.tag);
  const voterId = jsonString(payload.voterId).trim();
  const action = jsonString(payload.action);
  if (!communityTagSet.has(tag)) {
    throw new ApiError(400, 'Unknown community tag.');
  }
  if (voterId.length < 8 || voterId.length > 64) {
    throw new ApiError(400, 'Invalid voter id.');
  }
  if (action !== 'add' && action !== 'remove') {
    throw new ApiError(400, 'Invalid vote action.');
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!(await withinRateLimit(env, ip))) {
    throw new ApiError(429, 'Too many votes. Try again later.');
  }

  if (action === 'add') {
    await env.DB.prepare(
      `
      INSERT INTO community_tag_votes (uid, tag, voter_id, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(uid, tag, voter_id) DO NOTHING
      `,
    )
      .bind(uid, tag, voterId, isoNow())
      .run();
  } else {
    await env.DB.prepare(
      'DELETE FROM community_tag_votes WHERE uid = ? AND tag = ? AND voter_id = ?',
    )
      .bind(uid, tag, voterId)
      .run();
  }

  return { tags: await listCommunityTags(env, uid, voterId) };
}

function methodNotAllowed(): Response {
  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
}

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (pathname === '/api/players') {
    if (request.method !== 'GET') {
      return methodNotAllowed();
    }
    return jsonResponse(await listD1Players(env));
  }

  if (pathname === '/api/players/search') {
    if (request.method !== 'GET') {
      return methodNotAllowed();
    }
    const rows = await searchD1CachedPlayerRows(env, url.searchParams.get('q') ?? '');
    const players = cachedRowsToPlayers(rows);
    await enrichWithCommunityTags(env, players);
    return jsonResponse({ players });
  }

  const tagsRoute = /^\/api\/players\/(\d+)\/tags$/.exec(pathname);
  if (tagsRoute) {
    const uid = Number(tagsRoute[1]);
    if (request.method === 'GET') {
      return jsonResponse({
        tags: await listCommunityTags(env, uid, url.searchParams.get('voter') ?? ''),
      });
    }
    if (request.method === 'POST') {
      return jsonResponse(await submitCommunityTagVote(env, request, uid));
    }
    return methodNotAllowed();
  }

  return jsonResponse({ error: 'Not found' }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApiRequest(request, env);
      } catch (error) {
        if (error instanceof ApiError) {
          return jsonResponse({ error: error.message }, { status: error.status });
        }
        throw error;
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
