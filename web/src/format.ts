export function formatRate(rate: number | undefined): string {
  if (rate === undefined) {
    return '-';
  }
  return `${(rate / 100).toFixed(2)}%`;
}

export function formatInteger(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return '-';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatProfit(value: number | undefined): string {
  if (value === undefined) {
    return '-';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatInteger(value)}`;
}
