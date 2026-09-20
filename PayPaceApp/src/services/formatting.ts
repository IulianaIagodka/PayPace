const symbols: Record<string, string> = {
  PLN: 'zł',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencySymbol(code: string): string {
  return symbols[code] ?? code;
}

export function formatMoney(amount: number, code = 'PLN'): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded).toLocaleString('pl-PL');
  const sign = rounded < 0 ? '−' : '';
  const symbol = currencySymbol(code);
  if (code === 'PLN') return `${sign}${abs} ${symbol}`;
  return `${sign}${symbol}${abs}`;
}

export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(',', '.').replace(/\s/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
