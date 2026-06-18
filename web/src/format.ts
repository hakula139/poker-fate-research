import type { Locale } from './locale';

export type NumberFormatters = {
  compactInteger: (value: number | undefined | null) => string;
  compactProfit: (value: number | undefined) => string;
  integer: (value: number | undefined | null) => string;
  profit: (value: number | undefined) => string;
  rate: (rate: number | undefined) => string;
};

const missingValue = '-';

export function createFormatters(locale: Locale): NumberFormatters {
  const compactIntegerFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    notation: 'compact',
  });
  const integerFormatter = new Intl.NumberFormat(locale);
  const rateFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'percent',
  });

  function integer(value: number | undefined | null): string {
    if (value === undefined || value === null) {
      return missingValue;
    }
    return integerFormatter.format(value);
  }

  function compactInteger(value: number | undefined | null): string {
    if (value === undefined || value === null) {
      return missingValue;
    }
    return compactIntegerFormatter.format(value);
  }

  function profit(value: number | undefined): string {
    if (value === undefined) {
      return missingValue;
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${integer(value)}`;
  }

  function compactProfit(value: number | undefined): string {
    if (value === undefined) {
      return missingValue;
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${compactInteger(value)}`;
  }

  function rate(rateValue: number | undefined): string {
    if (rateValue === undefined) {
      return missingValue;
    }
    return rateFormatter.format(rateValue / 10000);
  }

  return { compactInteger, compactProfit, integer, profit, rate };
}
