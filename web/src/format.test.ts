import { describe, expect, it } from 'vitest';

import { createFormatters } from './format';

describe('createFormatters', () => {
  const en = createFormatters('en');

  it('renders API rate basis points as percentages', () => {
    expect(en.rate(2530)).toBe('25.30%');
  });

  it('renders missing values as dashes', () => {
    expect(en.rate(undefined)).toBe('-');
    expect(en.integer(null)).toBe('-');
  });

  it('renders positive profit with a sign', () => {
    expect(en.profit(1234567)).toBe('+1,234,567');
    expect(en.profit(-1234567)).toBe('-1,234,567');
  });

  it('renders compact profit for dense table columns', () => {
    expect(en.compactProfit(1840000000)).toBe('+1.84B');
    expect(en.compactProfit(1560000)).toBe('+1.56M');
    expect(en.compactProfit(-1560000)).toBe('-1.56M');
  });

  it('creates locale-aware formatter sets', () => {
    const format = createFormatters('zh-Hans');

    expect(format.rate(2530)).toBe('25.30%');
    expect(format.profit(1234567)).toBe('+1,234,567');
    expect(format.compactProfit(1234567)).toBe('+123.46万');
  });

  it('renders human-friendly relative times against a reference instant', () => {
    const now = Date.parse('2026-06-22T00:00:00Z');

    expect(en.relativeTime('2026-06-20T00:00:00Z', now)).toBe('2 days ago');
    expect(en.relativeTime('2026-06-21T22:00:00Z', now)).toBe('2 hours ago');
  });

  it('renders missing or unparsable timestamps as dashes', () => {
    expect(en.relativeTime(undefined)).toBe('-');
    expect(en.relativeTime('not-a-timestamp')).toBe('-');
    expect(en.dateTime(null)).toBe('-');
  });
});
