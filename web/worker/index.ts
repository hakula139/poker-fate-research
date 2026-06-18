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

function jsonResponse(value: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return Response.json(value, { ...init, headers });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertSnapshotIndex(value: unknown): asserts value is SnapshotIndex {
  if (!isRecord(value) || !Array.isArray(value.snapshots)) {
    throw new ApiError(502, 'Snapshot index has an invalid shape.');
  }
  for (const item of value.snapshots) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.path !== 'string') {
      throw new ApiError(502, 'Snapshot index has an invalid shape.');
    }
  }
}

function parseStoredJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new ApiError(502, 'Stored player data has an invalid shape.');
  }
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
    `
        SELECT id, label, source, generated_at, player_count
        FROM snapshots
        ORDER BY generated_at DESC
        LIMIT 30
      `,
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
    `
        SELECT id, label, source, generated_at, player_count
        FROM snapshots
        WHERE id = ?
      `,
  )
    .bind(snapshotId)
    .first<SnapshotRow>();

  if (!snapshot) {
    const existingSnapshot = await env.DB.prepare('SELECT id FROM snapshots LIMIT 1').first();
    if (!existingSnapshot) {
      return null;
    }
    throw new ApiError(404, 'Snapshot not found');
  }

  const { results = [] } = await env.DB.prepare(
    `
        SELECT player_json, leaderboard_entries_json, fetched_at
        FROM snapshot_players
        WHERE snapshot_id = ?
        ORDER BY uid
      `,
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

async function readAssetJson(env: Env, request: Request, path: string): Promise<unknown> {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = '';
  const response = await env.ASSETS.fetch(new Request(url, request));
  if (!response.ok) {
    throw new ApiError(response.status, 'Generated data is unavailable.');
  }
  return response.json();
}

async function readSnapshotIndex(env: Env, request: Request): Promise<SnapshotIndex> {
  const value = await readAssetJson(env, request, '/data/snapshots.json');
  assertSnapshotIndex(value);
  return value;
}

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  if (url.pathname === '/api/snapshots') {
    return jsonResponse(
      (await readD1SnapshotIndex(env)) ?? (await readSnapshotIndex(env, request)),
    );
  }

  const snapshotMatch = /^\/api\/snapshots\/([^/]+)$/.exec(url.pathname);
  if (snapshotMatch) {
    const snapshotId = decodeURIComponent(snapshotMatch[1]);
    const d1Snapshot = await readD1Snapshot(env, snapshotId);
    if (d1Snapshot) {
      return jsonResponse(d1Snapshot);
    }
    const index = await readSnapshotIndex(env, request);
    const item = index.snapshots.find((snapshot) => snapshot.id === snapshotId);
    if (!item) {
      return jsonResponse({ error: 'Snapshot not found' }, { status: 404 });
    }
    return jsonResponse(await readAssetJson(env, request, `/${item.path}`));
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
