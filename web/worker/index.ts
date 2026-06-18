import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const baseHost = 'https://ga-foreign.poker-fate.com';
const loginVerifySalt = 'ba2798edafa12f3ae08822a3203158cb';
const cachedPlayerLimit = 1000;
const searchResultLimit = 20;
const officialLookupLimit = 5;
const cacheTtlDays = 30;
const gameTypes = [
  ['10010101', "Hold'em lobby"],
  ['10020101', 'Omaha lobby'],
  ['10050301', "SNG Hold'em"],
  ['20010103', "Friend-room Hold'em"],
] as const;

type Env = {
  ASSETS: Fetcher;
  DB?: Database;
  POKER_FATE_RESEARCH_DEVICE_TOKEN?: string;
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

type SnapshotIndexItem = {
  id: string;
  label?: string;
  path: string;
  playerCount?: number;
  source?: string;
};

type SnapshotIndex = {
  generatedAt?: string;
  snapshots: SnapshotIndexItem[];
};

type SnapshotRow = {
  generated_at: string;
  id: string;
  label: string;
  player_count: number;
  source: string;
};

type SnapshotPlayerRow = {
  fetched_at: string;
  leaderboard_entries_json: string;
  player_json: string;
};

type CachedPlayerRow = {
  alias: string | null;
  expires_at: string;
  player_json: string;
  uid: number;
};

type SnapshotResponse = {
  generatedAt: string;
  id: string;
  label: string;
  players: unknown[];
  source: string;
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

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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

function officialInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function officialString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function officialList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function officialRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function assertOfficialSuccess(
  path: string,
  request: unknown,
  response: unknown,
): asserts response is Record<string, unknown> {
  if (!isRecord(response) || response.code !== 0) {
    throw new ApiError(502, `${path} failed for ${JSON.stringify(request)}`);
  }
}

async function postOfficial(
  path: string,
  body: unknown,
  authorization?: string,
): Promise<Record<string, unknown>> {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (authorization) {
    headers.set('authorization', authorization);
  }

  const response = await fetch(`${baseHost}${path}`, {
    body: JSON.stringify(body),
    headers,
    method: 'POST',
  });
  if (!response.ok) {
    throw new ApiError(502, `${path} returned HTTP ${String(response.status)}`);
  }
  const payload = await response.json();
  if (!isRecord(payload)) {
    throw new ApiError(502, `${path} returned an invalid response`);
  }
  return payload;
}

async function loginGuest(env: Env): Promise<string> {
  const deviceToken = env.POKER_FATE_RESEARCH_DEVICE_TOKEN;
  if (!deviceToken) {
    throw new ApiError(503, 'Player lookup is not configured.');
  }

  const osName = 'Android';
  const body = {
    adjust_id: null,
    imei: deviceToken,
    lang: 'en',
    mask: 'LoginHttp',
    os: osName,
    token: deviceToken,
    type: 1,
    verify: bytesToHex(md5(utf8ToBytes(osName + deviceToken + loginVerifySalt))),
  };
  const response = await postOfficial('/login', body);
  assertOfficialSuccess('/login', body, response);
  const authorization = response.authorization;
  if (typeof authorization !== 'string' || !authorization) {
    throw new ApiError(502, 'Login response did not include authorization.');
  }
  return authorization;
}

function normalizeGame(gameType: string, label: string, value: unknown) {
  const item = officialRecord(value);
  return {
    afq: officialInt(item.active_rate),
    cbet: officialInt(item.c_bete_rate),
    gameType: Number(gameType),
    hands: officialInt(item.play_times),
    label,
    maxProfit: officialInt(item.max_profit),
    pfr: officialInt(item.add_before_flipping_rate),
    profit: officialInt(item.profit),
    rounds: officialInt(item.round),
    score: officialInt(item.champion_points) || officialInt(item.fire_power),
    threeBet: officialInt(item.three_bet_rate),
    tourMaxProfit: officialInt(item.tour_max_profit),
    tourProfit: officialInt(item.tour_profit),
    tourRounds: officialInt(item.tour_round),
    tourWinRounds: officialInt(item.tour_win_round),
    vpip: officialInt(item.pool_entry_rate),
    winHands: officialInt(item.win_play_times),
    winRounds: officialInt(item.win_round),
    wtsd: officialInt(item.show_hand_rate),
  };
}

async function fetchOfficialPlayer(
  authorization: string,
  uid: number,
  names: string[],
): Promise<Record<string, unknown>> {
  const games: Record<string, unknown> = {};
  for (const [gameType, label] of gameTypes) {
    const body = { game_type: Number(gameType), lang: 'en', player_uid: uid };
    const response = await postOfficial('/player/gameData', body, authorization);
    assertOfficialSuccess('/player/gameData', body, response);
    const data = officialRecord(response.data);
    games[gameType] = normalizeGame(gameType, label, data);
  }

  const sngBody = { player_uid: uid };
  const sngRecord = await postOfficial('/player/sngRecord', sngBody, authorization);
  assertOfficialSuccess('/player/sngRecord', sngBody, sngRecord);

  return {
    fetchedAt: isoNow(),
    games,
    leaderboardEntries: [],
    name: names[0] ?? String(uid),
    names,
    sngRecordCount: officialList(sngRecord.list).length,
    uid,
  };
}

function snapshotItemFromRow(row: SnapshotRow): SnapshotIndexItem {
  return {
    id: row.id,
    label: row.label,
    path: `api/snapshots/${encodeURIComponent(row.id)}`,
    playerCount: row.player_count,
    source: row.source,
  };
}

async function readD1SnapshotIndex(env: Env): Promise<SnapshotIndex | null> {
  if (!env.DB) {
    return null;
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT id, label, source, generated_at, player_count
     FROM snapshots
     ORDER BY generated_at DESC
     LIMIT 30`,
  ).all<SnapshotRow>();

  if (results.length === 0) {
    return null;
  }

  const newestSnapshot = results[0];
  return {
    generatedAt: newestSnapshot.generated_at,
    snapshots: [...results].reverse().map(snapshotItemFromRow),
  };
}

async function readD1Snapshot(env: Env, snapshotId: string): Promise<SnapshotResponse | null> {
  if (!env.DB) {
    return null;
  }

  const snapshot = await env.DB.prepare(
    `SELECT id, label, source, generated_at, player_count
     FROM snapshots
     WHERE id = ?`,
  )
    .bind(snapshotId)
    .first<SnapshotRow>();

  if (!snapshot) {
    return null;
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT player_json, leaderboard_entries_json, fetched_at
     FROM snapshot_players
     WHERE snapshot_id = ?
     ORDER BY uid`,
  )
    .bind(snapshotId)
    .all<SnapshotPlayerRow>();

  const players = results.map((row) => {
    const player = parseStoredJson(row.player_json);
    if (!isRecord(player)) {
      throw new ApiError(502, 'Stored player data has an invalid shape.');
    }
    if (!Array.isArray(player.leaderboardEntries)) {
      return {
        ...player,
        fetchedAt: row.fetched_at,
        leaderboardEntries: parseStoredJson(row.leaderboard_entries_json),
      };
    }
    return player;
  });

  return {
    id: snapshot.id,
    label: snapshot.label,
    source: snapshot.source,
    generatedAt: snapshot.generated_at,
    players,
  };
}

function aliasesForPlayer(player: Record<string, unknown>): string[] {
  const names: unknown[] = Array.isArray(player.names) ? player.names : [];
  return [player.name, ...names].flatMap((name) =>
    typeof name === 'string' && name ? [name] : [],
  );
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
  return uniqueCachedPlayers(rows).map((row) => {
    const player = parseStoredJson(row.player_json);
    if (!isRecord(player)) {
      throw new ApiError(502, 'Stored player data has an invalid shape.');
    }
    return player;
  });
}

function isCacheFresh(row: CachedPlayerRow, now: string): boolean {
  return row.expires_at >= now;
}

function isDirectCacheHit(row: CachedPlayerRow, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  return String(row.uid) === normalizedQuery || row.alias?.toLowerCase() === normalizedQuery;
}

async function listD1CachedPlayerRows(env: Env): Promise<CachedPlayerRow[]> {
  if (!env.DB) {
    return [];
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT player_cache.uid, player_cache.player_json, player_cache.expires_at, NULL AS alias
     FROM player_cache
     WHERE player_cache.expires_at >= ?
     ORDER BY player_cache.fetched_at DESC
     LIMIT ?`,
  )
    .bind(isoNow(), cachedPlayerLimit)
    .all<CachedPlayerRow>();

  return results;
}

async function searchD1CachedPlayerRows(env: Env, query: string): Promise<CachedPlayerRow[]> {
  const trimmedQuery = query.trim();
  if (!env.DB || trimmedQuery.length < 2) {
    return [];
  }

  const { results = [] } = await env.DB.prepare(
    `SELECT
       player_cache.uid,
       player_cache.player_json,
       player_cache.expires_at,
       player_aliases.alias
     FROM player_cache
     LEFT JOIN player_aliases ON player_aliases.uid = player_cache.uid
     WHERE CAST(player_cache.uid AS TEXT) = ?
       OR player_aliases.alias LIKE ?
     ORDER BY player_cache.fetched_at DESC
     LIMIT ?`,
  )
    .bind(trimmedQuery, `%${trimmedQuery}%`, searchResultLimit)
    .all<CachedPlayerRow>();

  return results;
}

async function cachePlayer(
  env: Env,
  player: Record<string, unknown>,
  source: string,
): Promise<void> {
  const uid = officialInt(player.uid);
  if (!env.DB || uid <= 0) {
    return;
  }

  const fetchedAt = officialString(player.fetchedAt) || isoNow();
  await env.DB.prepare(
    `INSERT INTO player_cache (uid, player_json, source, fetched_at, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET
       player_json = excluded.player_json,
       source = excluded.source,
       fetched_at = excluded.fetched_at,
       expires_at = excluded.expires_at`,
  )
    .bind(uid, JSON.stringify(player), source, fetchedAt, isoDaysFromNow(cacheTtlDays))
    .run();

  for (const alias of aliasesForPlayer(player)) {
    await env.DB.prepare(
      `INSERT INTO player_aliases (alias, uid, source, observed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(alias) DO UPDATE SET
         uid = excluded.uid,
         source = excluded.source,
         observed_at = excluded.observed_at`,
    )
      .bind(alias, uid, source, isoNow())
      .run();
  }
}

async function lookupOfficialPlayers(env: Env, query: string): Promise<unknown[]> {
  const authorization = await loginGuest(env);
  const trimmedQuery = query.trim();
  const body: Record<string, unknown> = { nickname: trimmedQuery };
  if (/^\d+$/.test(trimmedQuery)) {
    body.friend_uid = Number(trimmedQuery);
  }

  const response = await postOfficial('/friend/searchList', body, authorization);
  assertOfficialSuccess('/friend/searchList', body, response);

  const seen = new Set<number>();
  const players: Record<string, unknown>[] = [];
  for (const item of officialList(response.list)) {
    const record = officialRecord(item);
    const uid = officialInt(record.uid);
    if (uid <= 0 || seen.has(uid)) {
      continue;
    }
    seen.add(uid);
    const nickname = officialString(record.nickname);
    const player = await fetchOfficialPlayer(authorization, uid, nickname ? [nickname] : []);
    players.push(player);
    if (players.length >= officialLookupLimit) {
      break;
    }
  }

  for (const player of players) {
    await cachePlayer(env, player, 'lookup');
  }
  return players;
}

async function searchPlayers(env: Env, query: string): Promise<unknown[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const now = isoNow();
  const cachedRows = await searchD1CachedPlayerRows(env, trimmedQuery);
  const directStaleHit = cachedRows.some(
    (row) => isDirectCacheHit(row, trimmedQuery) && !isCacheFresh(row, now),
  );
  const freshRows = cachedRows.filter((row) => isCacheFresh(row, now));

  if (freshRows.length > 0 && !directStaleHit) {
    return cachedRowsToPlayers(freshRows);
  }

  try {
    const officialPlayers = await lookupOfficialPlayers(env, trimmedQuery);
    return officialPlayers.length > 0 ? officialPlayers : cachedRowsToPlayers(freshRows);
  } catch (error) {
    if (freshRows.length > 0) {
      return cachedRowsToPlayers(freshRows);
    }
    throw error;
  }
}

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  if (url.pathname === '/api/snapshots') {
    return jsonResponse(
      (await readD1SnapshotIndex(env)) ?? { generatedAt: isoNow(), snapshots: [] },
    );
  }

  if (url.pathname === '/api/players/search') {
    return jsonResponse({
      players: await searchPlayers(env, url.searchParams.get('q') ?? ''),
    });
  }

  if (url.pathname === '/api/players/cached') {
    return jsonResponse({ players: cachedRowsToPlayers(await listD1CachedPlayerRows(env)) });
  }

  const snapshotMatch = /^\/api\/snapshots\/([^/]+)$/.exec(url.pathname);
  if (snapshotMatch) {
    const snapshotId = decodeURIComponent(snapshotMatch[1]);
    const d1Snapshot = await readD1Snapshot(env, snapshotId);
    if (d1Snapshot) {
      return jsonResponse(d1Snapshot);
    }
    return jsonResponse({ error: 'Snapshot not found' }, { status: 404 });
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
