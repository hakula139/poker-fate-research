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
    expect(result.error).toBe('indexUnavailable');
    expect(result.active.id).toBe('sample');
  });

  it('reports sample fallback when generated data has an invalid shape', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve(Response.json({ generatedAt: '2026-06-12T08:50:28Z' })),
    );

    const result = await loadSnapshots();

    expect(result.source).toBe('sample');
    expect(result.error).toBe('indexInvalid');
    expect(result.active.id).toBe('sample');
  });
});
