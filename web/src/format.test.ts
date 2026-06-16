import { describe, expect, it } from 'vitest';

import { formatInteger, formatProfit, formatRate } from './format';

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
});
