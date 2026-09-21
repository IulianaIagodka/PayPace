export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  /** When true, amount is formatted as "120 грн" instead of "грн120". */
  symbolAfter: boolean;
};

/**
 * Currencies for major markets + UAH/PLN.
 * Default for new installs: device country currency when supported, else USD.
 */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'USA — dollar', symbolAfter: false },
  { code: 'EUR', symbol: '€', name: 'Eurozone — euro', symbolAfter: false },
  { code: 'PLN', symbol: 'zł', name: 'Poland — złoty', symbolAfter: true },
  { code: 'UAH', symbol: 'грн', name: 'Україна — гривня', symbolAfter: true },
  { code: 'GBP', symbol: '£', name: 'United Kingdom — pound', symbolAfter: false },
  { code: 'JPY', symbol: '¥', name: 'Japan — yen', symbolAfter: false },
  { code: 'CNY', symbol: '¥', name: 'China — yuan', symbolAfter: false },
  { code: 'KRW', symbol: '₩', name: 'South Korea — won', symbolAfter: false },
  { code: 'CAD', symbol: 'C$', name: 'Canada — dollar', symbolAfter: false },
  { code: 'AUD', symbol: 'A$', name: 'Australia — dollar', symbolAfter: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazil — real', symbolAfter: false },
  { code: 'MXN', symbol: 'MX$', name: 'Mexico — peso', symbolAfter: false },
];

const byCode = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

/** ISO region → currency for markets we support. */
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  PR: 'USD',
  GU: 'USD',
  AS: 'USD',
  VI: 'USD',
  PL: 'PLN',
  UA: 'UAH',
  GB: 'GBP',
  UK: 'GBP',
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  CA: 'CAD',
  AU: 'AUD',
  BR: 'BRL',
  MX: 'MXN',
  // Eurozone (common)
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  LT: 'EUR',
  LV: 'EUR',
  EE: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  HR: 'EUR',
};

export function getCurrency(code: string): CurrencyOption {
  return (
    byCode[code] ?? {
      code,
      symbol: code,
      name: code,
      symbolAfter: true,
    }
  );
}

export function isSupportedCurrency(code: string): boolean {
  return Boolean(byCode[code]);
}

/**
 * Prefer the device/region currency when we support it; otherwise USD ($).
 */
export function detectDefaultCurrency(): string {
  try {
    const locale =
      (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().locale) ||
      (typeof navigator !== 'undefined' ? navigator.language : '') ||
      'en-US';
    const parts = locale.replace('_', '-').split('-');
    const region = (parts[1] || parts[0] || '').toUpperCase();
    const mapped = REGION_CURRENCY[region];
    if (mapped && isSupportedCurrency(mapped)) return mapped;
  } catch {
    // ignore
  }
  return 'USD';
}
