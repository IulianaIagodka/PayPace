import { subDays } from 'date-fns';
import type { ExpenseCategory } from '../models/types';
import { guessCategory } from './categories';
import { newId } from './id';
import { toDateKey } from './formatting';
import {
  parseStatementText as parseStatementRows,
  parseStatementDate,
  cleanMerchantName,
  splitDelimitedLine,
  parseAmountTokenSigned,
} from './statementParse';

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

export {
  parseStatementDate,
  cleanMerchantName,
  splitDelimitedLine,
  parseAmountTokenSigned,
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

/** Parse CSV / TSV / semicolon bank exports into categorized expense line items. */
export function parseStatementText(text: string): StatementLineItem[] {
  return parseStatementRows(text).map((row) => ({
    id: newId(),
    name: row.name,
    amount: row.amount,
    date: row.date,
    category: guessCategory(row.name),
  }));
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
      const parsed = parseStatementText(text);
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
