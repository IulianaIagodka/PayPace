import { startOfDay } from 'date-fns';
import { getCurrency } from './currencies';

export function currencySymbol(code: string): string {
  return getCurrency(code).symbol;
}

export function formatMoney(
  amount: number,
  code = 'USD',
  opts?: { decimals?: number },
): string {
  const value = asMoney(amount);
  const decimals = opts?.decimals;
  const rounded =
    decimals == null ? Math.round(value) : Number(value.toFixed(decimals));
  const abs =
    decimals == null
      ? Math.abs(rounded).toLocaleString('uk-UA')
      : Math.abs(rounded).toLocaleString('uk-UA', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  const sign = rounded < 0 ? '−' : '';
  const { symbol, symbolAfter } = getCurrency(code);
  if (symbolAfter) return `${sign}${abs} ${symbol}`;
  return `${sign}${symbol}${abs}`;
}

/** Coerce persisted values to finite numbers (guards string concat bugs). */
export function asMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(',', '.').replace(/\s/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Expenses must be strictly positive — negatives would inflate safe-to-spend. */
export function parsePositiveAmount(text: string): number | null {
  const value = parseAmount(text);
  if (value == null || value <= 0) return null;
  return value;
}

/** Local calendar date YYYY-MM-DD (avoids UTC timezone day shifts). */
export function toDateKey(date: Date): string {
  const d = startOfDay(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(value: string): Date {
  const key = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return startOfDay(new Date(y, m - 1, d));
  }
  return startOfDay(new Date(value));
}

export function formatShortDate(isoOrKey: string): string {
  return fromDateKey(isoOrKey).toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });
}
