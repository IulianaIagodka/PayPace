import { format, subDays } from 'date-fns';
import type { ExpenseCategory } from '../models/types';
import { guessCategory } from './categories';
import { newId } from './id';
import { toDateKey } from './formatting';

export type StatementLineItem = {
  id: string;
  name: string;
  amount: number;
  date?: string;
  category: ExpenseCategory;
};

export type StatementImportResult = {
  sourceName: string;
  items: StatementLineItem[];
  source: 'parsed' | 'demo';
};

function demoStatement(fileName: string): StatementImportResult {
  const today = new Date();
  const samples = [
    { name: 'Biedronka', amount: 86.4, daysAgo: 1 },
    { name: 'Żabka', amount: 24.9, daysAgo: 3 },
    { name: 'Uber Trip', amount: 31.5, daysAgo: 5 },
    { name: 'Netflix', amount: 43, daysAgo: 12 },
    { name: 'Orlen Fuel', amount: 210, daysAgo: 18 },
    { name: 'McDonalds', amount: 38.2, daysAgo: 25 },
  ];
  return {
    sourceName: fileName || 'statement.csv',
    source: 'demo',
    items: samples.map((s) => ({
      id: newId(),
      name: s.name,
      amount: s.amount,
      date: toDateKey(subDays(today, s.daysAgo)),
      category: guessCategory(s.name),
    })),
  };
}

function parseAmountToken(raw: string): number | null {
  let cleaned = raw.trim().replace(/\s/g, '').replace(/[^\d,.\-+]/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value === 0) return null;
  return Math.abs(value);
}

/** Parse common bank date formats into YYYY-MM-DD. */
export function parseStatementDate(raw: string, now = new Date()): string | null {
  const text = raw.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec(text);
  if (dmy) {
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return format(new Date(y, m - 1, d), 'yyyy-MM-dd');
    }
  }

  const mdy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  // already covered by dmy for numeric; skip ambiguous US unless needed

  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    if (d.getFullYear() > 2000 && d.getFullYear() < now.getFullYear() + 2) {
      return toDateKey(d);
    }
  }
  return null;
}

function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes('amount') ||
    lower.includes('kwota') ||
    lower.includes('suma') ||
    lower.includes('description') ||
    lower.includes('opis') ||
    lower.includes('title') ||
    lower.includes('nazwa') ||
    lower.includes('date') ||
    lower.includes('data')
  );
}

function parseDelimited(text: string): StatementLineItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const delim = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
  const start = looksLikeHeader(lines[0]) ? 1 : 0;
  const items: StatementLineItem[] = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    let amount: number | null = null;
    let amountIdx = -1;
    for (let c = cols.length - 1; c >= 0; c--) {
      const parsed = parseAmountToken(cols[c]);
      if (parsed != null) {
        amount = parsed;
        amountIdx = c;
        break;
      }
    }
    if (amount == null) continue;

    let date: string | undefined;
    let dateIdx = -1;
    for (let c = 0; c < cols.length; c++) {
      if (c === amountIdx) continue;
      const parsed = parseStatementDate(cols[c]);
      if (parsed) {
        date = parsed;
        dateIdx = c;
        break;
      }
    }

    const nameParts = cols.filter(
      (_, idx) => idx !== amountIdx && idx !== dateIdx && cols[idx].length > 1,
    );
    const name = (nameParts.find((p) => /[a-zA-Zа-яА-ЯіІїЇєЄęółąśżźćń]/i.test(p)) ??
      nameParts[0] ??
      'Transaction'
    ).slice(0, 80);

    items.push({
      id: newId(),
      name,
      amount,
      date,
      category: guessCategory(name),
    });
  }

  return items;
}

function parseLooseText(text: string): StatementLineItem[] {
  const items: StatementLineItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const withDate = line.match(
      /^(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\d+[.,]\d{2})\s*$/,
    );
    if (withDate) {
      const amount = parseAmountToken(withDate[3]);
      if (amount == null) continue;
      items.push({
        id: newId(),
        name: withDate[2].trim().slice(0, 80) || 'Transaction',
        amount,
        date: parseStatementDate(withDate[1]) ?? undefined,
        category: guessCategory(withDate[2]),
      });
      continue;
    }
    const match = line.match(/(.+?)\s+(-?\d+[.,]\d{2})\s*$/);
    if (!match) continue;
    const amount = parseAmountToken(match[2]);
    if (amount == null) continue;
    const name = match[1].replace(/[\d./-]+$/, '').trim() || 'Transaction';
    const leadingDate = parseStatementDate(match[1].trim().split(/\s+/)[0] ?? '');
    items.push({
      id: newId(),
      name: name.slice(0, 80),
      amount,
      date: leadingDate ?? undefined,
      category: guessCategory(name),
    });
  }
  return items;
}

/**
 * Parse a bank statement / CSV export into expense line items.
 * Throws when the file cannot be parsed — never invents demo rows in production.
 */
export async function analyzeStatementFile(
  uri: string,
  fileName: string,
  mimeType?: string | null,
  options?: { allowDemo?: boolean },
): Promise<StatementImportResult> {
  const lowerName = (fileName || '').toLowerCase();
  const isProbablyBinary =
    lowerName.endsWith('.pdf') ||
    (mimeType ?? '').includes('pdf') ||
    (mimeType ?? '').includes('image');

  if (isProbablyBinary) {
    if (options?.allowDemo) return demoStatement(fileName || 'statement');
    throw new Error(
      'PDF/image statements aren’t supported yet. Export a CSV or text statement from your bank, then try again.',
    );
  }

  try {
    const response = await fetch(uri);
    const text = await response.text();
    if (text && !text.includes('\u0000') && text.length < 2_000_000) {
      const parsed =
        lowerName.endsWith('.csv') || text.includes(';') || text.includes(',')
          ? parseDelimited(text)
          : parseLooseText(text);
      if (parsed.length) {
        return { sourceName: fileName || 'statement', items: parsed, source: 'parsed' };
      }
    }
  } catch (error) {
    if (options?.allowDemo) return demoStatement(fileName || 'statement');
    const detail = error instanceof Error ? error.message : 'Could not read the file.';
    throw new Error(detail);
  }

  if (options?.allowDemo) return demoStatement(fileName || 'statement');
  throw new Error(
    'Couldn’t find expenses in that file. Use a CSV export with date, description, and amount columns.',
  );
}
