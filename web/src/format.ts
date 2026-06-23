import type { Locale } from './locale';

export type NumberFormatters = {
  compactInteger: (value: number | undefined | null) => string;
  compactProfit: (value: number | undefined) => string;
  dateTime: (value: string | undefined | null) => string;
  integer: (value: number | undefined | null) => string;
  profit: (value: number | undefined) => string;
  rate: (rate: number | undefined) => string;
  relativeTime: (value: string | undefined | null, now?: number) => string;
};

const missingValue = '-';

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

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
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

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

  function dateTime(value: string | undefined | null): string {
    if (!value) {
      return missingValue;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? missingValue : dateTimeFormatter.format(timestamp);
  }

  function relativeTime(value: string | undefined | null, now = Date.now()): string {
    if (!value) {
      return missingValue;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return missingValue;
    }
    const diffSeconds = Math.round((timestamp - now) / 1000);
    for (const [unit, secondsInUnit] of relativeUnits) {
      if (Math.abs(diffSeconds) >= secondsInUnit) {
        return relativeTimeFormatter.format(Math.round(diffSeconds / secondsInUnit), unit);
      }
    }
    return relativeTimeFormatter.format(diffSeconds, 'second');
  }

  return { compactInteger, compactProfit, dateTime, integer, profit, rate, relativeTime };
}
