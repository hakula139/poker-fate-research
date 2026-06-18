type Env = {
  ASSETS: Fetcher;
};

type SnapshotIndexItem = {
  id: string;
  path: string;
};

type SnapshotIndex = {
  snapshots: SnapshotIndexItem[];
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
    return jsonResponse(await readSnapshotIndex(env, request));
  }

  const snapshotMatch = /^\/api\/snapshots\/([^/]+)$/.exec(url.pathname);
  if (snapshotMatch) {
    const snapshotId = decodeURIComponent(snapshotMatch[1]);
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
