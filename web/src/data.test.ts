import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSnapshots } from './data';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('loadSnapshots', () => {
  it('reports sample fallback when generated data is unavailable', async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 404 })));

    const result = await loadSnapshots();

    expect(result.source).toBe('sample');
    expect(result.error).toBe('snapshot index is unavailable');
    expect(result.active.id).toBe('sample');
  });
});
