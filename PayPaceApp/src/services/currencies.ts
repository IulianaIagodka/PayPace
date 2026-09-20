export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  /** When true, amount is formatted as "120 грн" instead of "грн120". */
  symbolAfter: boolean;
};

/** Common country currencies for PayPace. */
export const CURRENCIES: CurrencyOption[] = [
  { code: 'UAH', symbol: 'грн', name: 'Ukraine — hryvnia', symbolAfter: true },
  { code: 'PLN', symbol: 'zł', name: 'Poland — złoty', symbolAfter: true },
  { code: 'USD', symbol: '$', name: 'United States — dollar', symbolAfter: false },
  { code: 'EUR', symbol: '€', name: 'Eurozone — euro', symbolAfter: false },
  { code: 'GBP', symbol: '£', name: 'United Kingdom — pound', symbolAfter: false },
  { code: 'CZK', symbol: 'Kč', name: 'Czechia — koruna', symbolAfter: true },
  { code: 'RON', symbol: 'lei', name: 'Romania — leu', symbolAfter: true },
  { code: 'HUF', symbol: 'Ft', name: 'Hungary — forint', symbolAfter: true },
  { code: 'CHF', symbol: 'CHF', name: 'Switzerland — franc', symbolAfter: true },
  { code: 'SEK', symbol: 'kr', name: 'Sweden — krona', symbolAfter: true },
  { code: 'NOK', symbol: 'kr', name: 'Norway — krone', symbolAfter: true },
  { code: 'DKK', symbol: 'kr', name: 'Denmark — krone', symbolAfter: true },
  { code: 'CAD', symbol: 'C$', name: 'Canada — dollar', symbolAfter: false },
  { code: 'AUD', symbol: 'A$', name: 'Australia — dollar', symbolAfter: false },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand — dollar', symbolAfter: false },
  { code: 'JPY', symbol: '¥', name: 'Japan — yen', symbolAfter: false },
  { code: 'CNY', symbol: '¥', name: 'China — yuan', symbolAfter: false },
  { code: 'KRW', symbol: '₩', name: 'South Korea — won', symbolAfter: false },
  { code: 'INR', symbol: '₹', name: 'India — rupee', symbolAfter: false },
  { code: 'BRL', symbol: 'R$', name: 'Brazil — real', symbolAfter: false },
  { code: 'MXN', symbol: 'MX$', name: 'Mexico — peso', symbolAfter: false },
  { code: 'TRY', symbol: '₺', name: 'Türkiye — lira', symbolAfter: false },
  { code: 'ILS', symbol: '₪', name: 'Israel — shekel', symbolAfter: false },
  { code: 'AED', symbol: 'د.إ', name: 'UAE — dirham', symbolAfter: true },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Arabia — riyal', symbolAfter: true },
  { code: 'ZAR', symbol: 'R', name: 'South Africa — rand', symbolAfter: false },
  { code: 'SGD', symbol: 'S$', name: 'Singapore — dollar', symbolAfter: false },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong — dollar', symbolAfter: false },
  { code: 'GEL', symbol: '₾', name: 'Georgia — lari', symbolAfter: false },
  { code: 'MDL', symbol: 'L', name: 'Moldova — leu', symbolAfter: true },
  { code: 'BGN', symbol: 'лв', name: 'Bulgaria — lev', symbolAfter: true },
  { code: 'RSD', symbol: 'дин', name: 'Serbia — dinar', symbolAfter: true },
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
