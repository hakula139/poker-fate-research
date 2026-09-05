import { md5 } from '@noble/hashes/legacy.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

import { communityTags, communityTagThreshold } from '../src/features/player-stats/community-tags';
import { HOLDEM_GAME_TYPE } from '../src/features/player-stats/model';
import type { CommunityTag, CommunityTagCount, CommunityTagVote } from '../src/types';

const baseHost = 'https://ga-foreign.poker-fate.com';
const loginVerifySalt = 'ba2798edafa12f3ae08822a3203158cb';
const playerLimit = 1000;
const searchResultLimit = 20;
const officialLookupLimit = 5;
const cacheFreshnessMinutes = 60;
const holdemHandsPath = `$.games."${HOLDEM_GAME_TYPE}".hands`;
const gameTypes = [
  ['10010101', "Hold'em lobby"],
  ['10020101', 'Omaha lobby'],
  ['10050301', "SNG Hold'em"],
  ['20010103', "Friend-room Hold'em"],
] as const;

const communityVoteRateLimitPerHour = 60;
const communityVoteSalt = 'poker-fate.community-vote';
const communityTagSet = new Set<string>(communityTags);

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

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
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

function holdemHands(player: unknown): number {
  const games = officialRecord(officialRecord(player).games);
  return officialInt(officialRecord(games[HOLDEM_GAME_TYPE]).hands);
}

function hasHoldemHands(player: unknown): boolean {
  return holdemHands(player) > 0;
}

function assertOfficialSuccess(
  path: string,
  response: unknown,
): asserts response is Record<string, unknown> {
  if (!isRecord(response) || !Number.isSafeInteger(response.code)) {
    throw new ApiError(502, `${path} returned an invalid response code`);
  }
  if (path === '/login' && response.code === -5) {
    throw new ApiError(
      502,
      '/login failed with code -5: device risk verification failed. Contact Poker Fate support.',
    );
  }
  if (response.code !== 0) {
    throw new ApiError(502, `${path} failed with code ${String(response.code)}`);
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
  assertOfficialSuccess('/login', response);
  const authorization = response.authorization;
  if (typeof authorization !== 'string' || !authorization) {
    throw new ApiError(502, 'Login response did not include authorization.');
  }
  return authorization;
}

export function normalizeGame(gameType: string, label: string, value: unknown) {
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
    assertOfficialSuccess('/player/gameData', response);
    const data = officialRecord(response.data);
    games[gameType] = normalizeGame(gameType, label, data);
  }

  const sngBody = { player_uid: uid };
  const sngRecord = await postOfficial('/player/sngRecord', sngBody, authorization);
  assertOfficialSuccess('/player/sngRecord', sngRecord);

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
  return uniqueCachedPlayers(rows)
    .map((row) => parseStoredPlayer(row.player_json))
    .filter((player) => hasHoldemHands(player));
}

function isCacheFresh(row: CachedPlayerRow, freshnessThreshold: string): boolean {
  return row.fetched_at >= freshnessThreshold;
}

function isDirectCacheHit(row: CachedPlayerRow, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  return String(row.uid) === normalizedQuery || row.alias?.toLowerCase() === normalizedQuery;
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

async function existingLeaderboardEntries(env: Env, uid: number): Promise<unknown[]> {
  if (!env.DB) {
    return [];
  }
  const existing = await env.DB.prepare('SELECT player_json FROM players WHERE uid = ?')
    .bind(uid)
    .first<{ player_json: string }>();
  if (!existing) {
    return [];
  }
  const player = parseStoredPlayer(existing.player_json);
  const entries = player.leaderboardEntries;
  return Array.isArray(entries) ? (entries as unknown[]) : [];
}

async function cachePlayer(
  env: Env,
  player: Record<string, unknown>,
  source: string,
): Promise<Record<string, unknown>> {
  const uid = officialInt(player.uid);
  if (!env.DB || uid <= 0 || !hasHoldemHands(player)) {
    return player;
  }

  const rawEntries = player.leaderboardEntries;
  const incomingEntries: unknown[] = Array.isArray(rawEntries) ? (rawEntries as unknown[]) : [];
  const leaderboardEntries =
    incomingEntries.length > 0 ? incomingEntries : await existingLeaderboardEntries(env, uid);
  const stored: Record<string, unknown> = { ...player, leaderboardEntries };
  const fetchedAt = officialString(stored.fetchedAt) || isoNow();

  await env.DB.prepare(
    `
    INSERT INTO players (uid, player_json, source, fetched_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
      player_json = excluded.player_json,
      source = excluded.source,
      fetched_at = excluded.fetched_at
    `,
  )
    .bind(uid, JSON.stringify(stored), source, fetchedAt)
    .run();

  for (const alias of aliasesForPlayer(stored)) {
    await env.DB.prepare(
      `
      INSERT INTO player_aliases (alias, uid, source, observed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(alias) DO UPDATE SET
        uid = excluded.uid,
        source = excluded.source,
        observed_at = excluded.observed_at
      `,
    )
      .bind(alias, uid, source, isoNow())
      .run();
  }

  return stored;
}

async function lookupOfficialPlayers(env: Env, query: string): Promise<unknown[]> {
  const authorization = await loginGuest(env);
  const trimmedQuery = query.trim();
  const body: Record<string, unknown> = { nickname: trimmedQuery };
  if (/^\d+$/.test(trimmedQuery)) {
    body.friend_uid = Number(trimmedQuery);
  }

  const response = await postOfficial('/friend/searchList', body, authorization);
  assertOfficialSuccess('/friend/searchList', response);

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

  const stored: unknown[] = [];
  for (const player of players) {
    stored.push(await cachePlayer(env, player, 'lookup'));
  }
  return stored.filter((player) => hasHoldemHands(player));
}

async function refreshPlayerByUid(env: Env, uid: number): Promise<unknown> {
  if (!env.DB || uid <= 0) {
    return null;
  }

  const cached = await env.DB.prepare('SELECT player_json, fetched_at FROM players WHERE uid = ?')
    .bind(uid)
    .first<{ fetched_at: string; player_json: string }>();

  if (cached && isoMinutesAgo(cacheFreshnessMinutes) <= cached.fetched_at) {
    return parseStoredPlayer(cached.player_json);
  }

  const names = cached ? aliasesForPlayer(parseStoredPlayer(cached.player_json)) : [];
  const authorization = await loginGuest(env);
  const player = await fetchOfficialPlayer(authorization, uid, names);
  const stored = await cachePlayer(env, player, 'refresh');
  return hasHoldemHands(stored) ? stored : null;
}

async function searchPlayers(env: Env, query: string): Promise<unknown[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const freshnessThreshold = isoMinutesAgo(cacheFreshnessMinutes);
  const cachedRows = await searchD1CachedPlayerRows(env, trimmedQuery);
  const directStaleHit = cachedRows.some(
    (row) => isDirectCacheHit(row, trimmedQuery) && !isCacheFresh(row, freshnessThreshold),
  );
  const freshRows = cachedRows.filter((row) => isCacheFresh(row, freshnessThreshold));

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
    const tags = counts.get(officialInt(player.uid));
    if (tags?.length) {
      player.communityTags = tags;
    }
  }
}

async function enrichWithCommunityTags(env: Env, players: unknown[]): Promise<void> {
  const uids = players.flatMap((player) => (isRecord(player) ? [officialInt(player.uid)] : []));
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

  const tag = officialString(payload.tag);
  const voterId = officialString(payload.voterId).trim();
  const action = officialString(payload.action);
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
    const players = await searchPlayers(env, url.searchParams.get('q') ?? '');
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

  const playerByUid = /^\/api\/players\/(\d+)$/.exec(pathname);
  if (playerByUid) {
    if (request.method !== 'GET') {
      return methodNotAllowed();
    }
    const player = await refreshPlayerByUid(env, Number(playerByUid[1]));
    if (player) {
      await enrichWithCommunityTags(env, [player]);
    }
    return jsonResponse({ player });
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
