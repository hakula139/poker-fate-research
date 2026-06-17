import { describe, expect, it } from 'vitest';

import {
  createFormatters,
  formatCompactProfit,
  formatInteger,
  formatProfit,
  formatRate,
} from './format';

describe('format helpers', () => {
  it('renders API rate basis points as percentages', () => {
    expect(formatRate(2530)).toBe('25.30%');
  });

  it('renders missing values as dashes', () => {
    expect(formatRate(undefined)).toBe('-');
    expect(formatInteger(null)).toBe('-');
  });

  it('renders positive profit with a sign', () => {
    expect(formatProfit(1234567)).toBe('+1,234,567');
    expect(formatProfit(-1234567)).toBe('-1,234,567');
  });

  it('renders compact profit for dense table columns', () => {
    expect(formatCompactProfit(1840000000)).toBe('+1.84B');
    expect(formatCompactProfit(1560000)).toBe('+1.56M');
    expect(formatCompactProfit(-1560000)).toBe('-1.56M');
  });

  it('creates locale-aware formatter sets', () => {
    const format = createFormatters('zh-Hans');

    expect(format.rate(2530)).toBe('25.30%');
    expect(format.profit(1234567)).toBe('+1,234,567');
    expect(format.compactProfit(1234567)).toBe('+123.46万');
  });
});
