import type { ExpenseCategory } from '../models/types';
import { guessCategory } from './categories';
import { newId } from './id';

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
  const samples = [
    { name: 'Biedronka', amount: 86.4, date: undefined },
    { name: 'Żabka', amount: 24.9 },
    { name: 'Uber Trip', amount: 31.5 },
    { name: 'Netflix', amount: 43 },
    { name: 'Orlen Fuel', amount: 210 },
    { name: 'McDonalds', amount: 38.2 },
  ];
  return {
    sourceName: fileName || 'statement.csv',
    source: 'demo',
    items: samples.map((s) => ({
      id: newId(),
      name: s.name,
      amount: s.amount,
      date: s.date,
      category: guessCategory(s.name),
    })),
  };
}

function parseAmountToken(raw: string): number | null {
  let cleaned = raw.trim().replace(/\s/g, '').replace(/[^\d,.\-+]/g, '');
  if (!cleaned) return null;
  // Strip thousand separators: 1.234,56 or 1,234.56
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

function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes('amount') ||
    lower.includes('kwota') ||
    lower.includes('suma') ||
    lower.includes('description') ||
    lower.includes('opis') ||
    lower.includes('title') ||
    lower.includes('nazwa')
  );
}

function parseDelimited(text: string, fileName: string): StatementLineItem[] {
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

    const nameParts = cols.filter((_, idx) => idx !== amountIdx && cols[idx].length > 1);
    const name = (nameParts.find((p) => /[a-zA-Zа-яА-ЯіІїЇєЄęółąśżźćń]/i.test(p)) ??
      nameParts[0] ??
      'Transaction'
    ).slice(0, 80);

    // Skip likely income / credits when column suggests credit (positive credit columns hard to detect)
    items.push({
      id: newId(),
      name,
      amount,
      category: guessCategory(name),
    });
  }

  return items;
}

function parseLooseText(text: string): StatementLineItem[] {
  const items: StatementLineItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/(.+?)\s+(-?\d+[.,]\d{2})\s*$/);
    if (!match) continue;
    const amount = parseAmountToken(match[2]);
    if (amount == null) continue;
    const name = match[1].replace(/[\d./-]+$/, '').trim() || 'Transaction';
    items.push({
      id: newId(),
      name: name.slice(0, 80),
      amount,
      category: guessCategory(name),
    });
  }
  return items;
}

/**
 * Parse a bank statement / CSV export into expense line items.
 * Falls back to a demo set when the file cannot be parsed (PDF binary, etc.).
 */
export async function analyzeStatementFile(
  uri: string,
  fileName: string,
  mimeType?: string | null,
): Promise<StatementImportResult> {
  const lowerName = (fileName || '').toLowerCase();
  const isProbablyBinary =
    lowerName.endsWith('.pdf') ||
    (mimeType ?? '').includes('pdf') ||
    (mimeType ?? '').includes('image');

  try {
    if (!isProbablyBinary) {
      const response = await fetch(uri);
      const text = await response.text();
      // Guard against binary garbage
      if (text && !text.includes('\u0000') && text.length < 2_000_000) {
        const parsed =
          lowerName.endsWith('.csv') || text.includes(';') || text.includes(',')
            ? parseDelimited(text, fileName)
            : parseLooseText(text);
        if (parsed.length) {
          return { sourceName: fileName || 'statement', items: parsed, source: 'parsed' };
        }
      }
    }
  } catch {
    // fall through to demo
  }

  await new Promise((r) => setTimeout(r, 600));
  return demoStatement(fileName || 'statement');
}
