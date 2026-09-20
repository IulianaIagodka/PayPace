export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  /** When true, amount is formatted as "120 грн" instead of "грн120". */
  symbolAfter: boolean;
};

/**
 * Currencies for the top App Store / subscription-spend markets,
 * plus UAH for PayPace’s home market.
 *
 * Global top spenders typically: US, Japan, China, UK, Korea,
 * Eurozone (DE/FR/IT…), Canada, Australia, Brazil, Mexico.
 */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'UAH', symbol: 'грн', name: 'Україна — гривня', symbolAfter: true },
  { code: 'USD', symbol: '$', name: 'USA — dollar', symbolAfter: false },
  { code: 'JPY', symbol: '¥', name: 'Japan — yen', symbolAfter: false },
  { code: 'CNY', symbol: '¥', name: 'China — yuan', symbolAfter: false },
  { code: 'GBP', symbol: '£', name: 'United Kingdom — pound', symbolAfter: false },
  { code: 'KRW', symbol: '₩', name: 'South Korea — won', symbolAfter: false },
  { code: 'EUR', symbol: '€', name: 'Eurozone — euro', symbolAfter: false },
  { code: 'CAD', symbol: 'C$', name: 'Canada — dollar', symbolAfter: false },
  { code: 'AUD', symbol: 'A$', name: 'Australia — dollar', symbolAfter: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazil — real', symbolAfter: false },
  { code: 'MXN', symbol: 'MX$', name: 'Mexico — peso', symbolAfter: false },
];

const byCode = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

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
