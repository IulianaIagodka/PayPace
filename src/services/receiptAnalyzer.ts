import Constants from 'expo-constants';
import type { ExpenseCategory } from '../models/types';
import { guessCategory, SPENDING_CATEGORIES } from './categories';

export type ReceiptLineItem = {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
};

export type ReceiptScanResult = {
  merchant?: string;
  total?: number;
  items: ReceiptLineItem[];
  source: 'ai' | 'demo';
};

function extraConfig() {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
}

function isCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (SPENDING_CATEGORIES as string[]).includes(value);
}

function normalizeItem(
  nameRaw: unknown,
  amountRaw: unknown,
  categoryRaw: unknown,
  id: string,
): ReceiptLineItem | null {
  const name = String(nameRaw ?? '').trim();
  const amount = Number(amountRaw);
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;
  const guessed = guessCategory(name);
  const category = guessed !== 'other' ? guessed : isCategory(categoryRaw) ? categoryRaw : 'other';
  return { id, name, amount, category };
}

/** Offline Premium demo recognizer (used when no OpenAI key is set). */
function demoRecognize(): ReceiptScanResult {
  const samples = [
    { name: 'Milk 2.5%', amount: 42 },
    { name: 'White bread', amount: 28 },
    { name: 'Hard cheese', amount: 96 },
    { name: 'Americano', amount: 65 },
    { name: 'Uber Trip', amount: 120 },
    { name: 'Bananas 1kg', amount: 55 },
    { name: 'Yogurt', amount: 31 },
  ];
  const items = samples.map((s, index) => ({
    id: `demo-${index}`,
    name: s.name,
    amount: s.amount,
    category: guessCategory(s.name),
  }));
  return {
    merchant: 'Demo Market',
    total: items.reduce((sum, item) => sum + item.amount, 0),
    items,
    source: 'demo',
  };
}

async function recognizeWithOpenAI(base64: string, apiKey: string): Promise<ReceiptScanResult> {
  const prompt = `Extract receipt line items as JSON only:
{"merchant":"string","total":number,"items":[{"name":"string","amount":number,"category":"groceries|food|transport|subscriptions|utilities|childcare|rent|loan|other"}]}
Keep product names as printed. Amounts must be numbers.`;

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
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI receipt scan failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');

  const parsed = JSON.parse(content) as {
    merchant?: string;
    total?: number;
    items?: Array<{ name?: string; amount?: number; category?: string }>;
  };

  const items = (parsed.items ?? [])
    .map((row, index) => normalizeItem(row.name, row.amount, row.category, `ai-${index}`))
    .filter(Boolean) as ReceiptLineItem[];

  if (!items.length) throw new Error('No line items found');

  return {
    merchant: parsed.merchant,
    total: Number(parsed.total) || items.reduce((sum, item) => sum + item.amount, 0),
    items,
    source: 'ai',
  };
}

/**
 * Analyze a receipt photo. Prefer base64 from ImagePicker — avoids FileSystem encoding issues.
 * Without an OpenAI key, returns a categorized demo scan so Premium UX works offline.
 */
export async function analyzeReceiptPhoto(
  _uri: string,
  base64?: string | null,
): Promise<ReceiptScanResult> {
  const apiKey =
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    extraConfig().openaiApiKey ||
    extraConfig().EXPO_PUBLIC_OPENAI_API_KEY;

  // Short delay so Premium UI can show a recognition state
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (apiKey && base64) {
    try {
      return await recognizeWithOpenAI(base64, apiKey);
    } catch {
      // Keep Premium UX working in TestFlight without network / failed AI
    }
  }
  return demoRecognize();
}
