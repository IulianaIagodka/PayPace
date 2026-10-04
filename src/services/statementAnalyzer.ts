import { subDays } from 'date-fns';
import Constants from 'expo-constants';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import type { ExpenseCategory } from '../models/types';
import { guessCategory, isBuiltinCategory } from './categories';
import { newId } from './id';
import { toDateKey } from './formatting';
import {
  parseStatementText as parseStatementRows,
  parseStatementDate,
  cleanMerchantName,
  splitDelimitedLine,
  parseAmountTokenSigned,
  normalizeStatementAiItems,
  type StatementAiRow,
} from './statementParse';
import {
  extractPdfText,
  isStatementImage,
  isStatementPdf,
} from './statementPdf';

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
  source: 'parsed' | 'demo' | 'ai';
};

export {
  normalizeStatementAiItems,
  parseStatementDate,
  cleanMerchantName,
  splitDelimitedLine,
  parseAmountTokenSigned,
};

function extraConfig() {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
}

function resolveOpenAiApiKey(): string | undefined {
  const candidates = [
    process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    extraConfig().openaiApiKey,
    extraConfig().EXPO_PUBLIC_OPENAI_API_KEY,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function isCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (isBuiltinCategory(value) || value.startsWith('c_'));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

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

async function readFileBytes(uri: string): Promise<Uint8Array> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read the file (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function analyzePdfStatement(
  uri: string,
  fileName: string,
): Promise<StatementImportResult> {
  const bytes = await readFileBytes(uri);
  const text = await extractPdfText(bytes);
  const parsed = parseStatementText(text);
  if (!parsed.length) {
    throw new Error(
      'Couldn’t find expenses in this PDF. Try a CSV export, or a statement PDF with clear dates, merchants, and amounts.',
    );
  }
  return { sourceName: fileName || 'statement.pdf', items: parsed, source: 'parsed' };
}

async function readImageBase64(uri: string): Promise<string> {
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}

function mimeForImage(fileName: string, mimeType?: string | null): string {
  if (mimeType && mimeType.startsWith('image/')) return mimeType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function recognizeStatementImage(
  base64: string,
  mime: string,
  apiKey: string,
): Promise<StatementLineItem[]> {
  const prompt = `Extract EVERY debit (expense) from this bank statement photo into JSON only:
{"items":[{"name":"string","amount":number,"date":"YYYY-MM-DD","category":"home|groceries|food|transport|shopping|kids|health|fun|travel|subscriptions|other","status":"completed"}]}

Rules:
- This is a multi-day BANK STATEMENT, not a single store receipt.
- Each transaction is its OWN item with its OWN date and category (do NOT force one category).
- Use the Transaction date / Data transakcji for "date" — NEVER Booking date / Data księgowania / Document on / Document date.
- Dates must be YYYY-MM-DD. Example: "02 oct 2026" → "2026-10-02", "30 sep 2026" → "2026-09-30".
- Amount is the PLN (or statement currency) debit as a positive number (ignore the minus sign). Prefer the Amount column, not Balance / Saldo.
- name = merchant / payee (e.g. Apple, Lidl, Copenhagen Island) — not "Visa" / "Płatność Kartą" / card number.
- Skip rejected, declined, failed, cancelled, reversed or otherwise unsuccessful transactions: they are not expenses. Read status labels/icons in every row; never treat an attempted amount as money spent. Include the printed status in "status" (use "completed" when booked with no failure marker).
- Skip credits, incoming transfers, opening/closing balance, headers, footers, page numbers.
- Include all visible debit rows across the photo (every day shown).`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errJson = (await response.json()) as { error?: { message?: string } };
      detail = errJson.error?.message ? `: ${errJson.error.message}` : '';
    } catch {
      // ignore
    }
    if (response.status === 401) {
      throw new Error(`OpenAI rejected the API key (401)${detail}`);
    }
    if (response.status === 429) {
      throw new Error(`OpenAI rate limit or billing issue (429)${detail}`);
    }
    throw new Error(`Statement photo scan failed (${response.status})${detail}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response — try a clearer photo of the statement.');

  const parsed = JSON.parse(content) as {
    items?: StatementAiRow[];
  };
  const rows = normalizeStatementAiItems(parsed.items ?? []);
  if (!rows.length) {
    throw new Error('No expenses found on that statement photo. Try a sharper full-page shot.');
  }

  return rows.map((row) => {
    const aiCat = row.category;
    const guessed = guessCategory(row.name);
    const category =
      guessed !== 'other' ? guessed : isCategory(aiCat) ? aiCat : 'other';
    return {
      id: newId(),
      name: row.name,
      amount: row.amount,
      date: row.date,
      category,
    };
  });
}

/**
 * Parse a bank statement / CSV / PDF / statement photo into expense line items.
 * Throws when the file cannot be parsed — never invents demo rows in production.
 * PDF text is extracted on-device (not uploaded). Statement photos use OpenAI vision.
 */
export async function analyzeStatementFile(
  uri: string,
  fileName: string,
  mimeType?: string | null,
  options?: { allowDemo?: boolean; imageBase64?: string },
): Promise<StatementImportResult> {
  const allowDemo = options?.allowDemo === true;

  if (isStatementPdf(fileName, mimeType)) {
    try {
      return await analyzePdfStatement(uri, fileName);
    } catch (error) {
      if (allowDemo) return demoStatement(fileName || 'statement');
      const detail = error instanceof Error ? error.message : 'Could not read the PDF.';
      throw new Error(detail);
    }
  }

  if (isStatementImage(fileName, mimeType)) {
    const apiKey = resolveOpenAiApiKey();
    if (!apiKey) {
      if (allowDemo) return demoStatement(fileName || 'statement');
      throw new Error(
        'Statement photos need an OpenAI API key (same as receipt scan). Add EXPO_PUBLIC_OPENAI_API_KEY, then rebuild. Or export a CSV/PDF instead.',
      );
    }
    try {
      const base64 = options?.imageBase64?.trim() || (await readImageBase64(uri));
      if (!base64) {
        throw new Error('Could not read that photo. Try another screenshot of the statement.');
      }
      const items = await recognizeStatementImage(
        base64,
        mimeForImage(fileName, mimeType),
        apiKey,
      );
      return { sourceName: fileName || 'statement', items, source: 'ai' };
    } catch (error) {
      if (allowDemo) return demoStatement(fileName || 'statement');
      throw error instanceof Error ? error : new Error('Could not read the statement photo.');
    }
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
    if (allowDemo) return demoStatement(fileName || 'statement');
    const detail = error instanceof Error ? error.message : 'Could not read the file.';
    throw new Error(detail);
  }

  if (allowDemo) return demoStatement(fileName || 'statement');
  throw new Error(
    'Couldn’t find expenses in that file. Use a CSV/PDF export, or a clear photo of the statement pages.',
  );
}
