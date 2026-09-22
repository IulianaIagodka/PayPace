import Constants from 'expo-constants';
import type { ExpenseCategory } from '../models/types';
import { guessCategory, isBuiltinCategory } from './categories';

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

/** OpenAI key from Metro inlined env or app.config.js → extra. */
export function resolveOpenAiApiKey(): string | undefined {
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

const DISCOUNT_NAME =
  /\b(opust|rabat|discount|zni[zż]ka|promo|bonus)\b/i;

function looksLikeDiscountLine(name: string): boolean {
  return DISCOUNT_NAME.test(name.trim());
}

function normalizeItem(
  nameRaw: unknown,
  amountRaw: unknown,
  categoryRaw: unknown,
  id: string,
): ReceiptLineItem | null {
  const name = String(nameRaw ?? '').trim();
  const amount = roundMoney(Number(amountRaw));
  if (!name || !Number.isFinite(amount) || amount <= 0) return null;
  if (looksLikeDiscountLine(name)) return null;
  const guessed = guessCategory(name);
  const category = guessed !== 'other' ? guessed : isCategory(categoryRaw) ? categoryRaw : 'other';
  return { id, name, amount, category };
}

/**
 * If line items don't add up to the printed total (common when AI uses
 * pre-discount prices), scale them so they match SUMA / TOTAL.
 */
export function reconcileItemsToTotal(
  items: ReceiptLineItem[],
  totalRaw: unknown,
): { items: ReceiptLineItem[]; total: number } {
  const itemsSum = roundMoney(items.reduce((s, i) => s + i.amount, 0));
  const printed = Number(totalRaw);
  const total =
    Number.isFinite(printed) && printed > 0 ? roundMoney(printed) : itemsSum;

  if (!items.length) return { items, total };

  const gap = Math.abs(itemsSum - total);
  // Ignore tiny float noise; only fix real mismatches (e.g. discounts ignored).
  if (gap < 0.05 || itemsSum <= 0) {
    return { items, total: total > 0 ? total : itemsSum };
  }

  const scale = total / itemsSum;
  const scaled = items.map((item, index) => ({
    ...item,
    id: item.id || `ai-${index}`,
    amount: roundMoney(item.amount * scale),
  }));

  // Fix leftover cents on the largest line so the sum matches exactly.
  const scaledSum = roundMoney(scaled.reduce((s, i) => s + i.amount, 0));
  const drift = roundMoney(total - scaledSum);
  if (drift !== 0 && scaled.length) {
    let biggest = 0;
    for (let i = 1; i < scaled.length; i++) {
      if (scaled[i].amount > scaled[biggest].amount) biggest = i;
    }
    scaled[biggest] = {
      ...scaled[biggest],
      amount: roundMoney(scaled[biggest].amount + drift),
    };
  }

  return { items: scaled, total };
}

/** Offline demo recognizer — only when explicitly requested (dev / missing key tests). */
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
  const prompt = `Extract this receipt into JSON only:
{"merchant":"string","total":number,"items":[{"name":"string","amount":number,"category":"groceries|food|transport|subscriptions|utilities|childcare|rent|loan|other"}]}

Rules:
- Use the FINAL amount paid for each product AFTER discounts (OPUST, RABAT, zniżka, promo).
- Do NOT list discount / OPUST / RABAT lines as separate items.
- For qty × price lines, amount = quantity × unit price − that line's discount.
- Keep product names as printed (any language).
- "total" must be the receipt grand total (SUMA / TOTAL / do zapłaty) — usually the bold total near the bottom.
- The sum of item amounts must equal "total" (within 0.01).
- Amounts are numbers with up to 2 decimals (use comma or dot from the receipt correctly).
- Ignore tax-only, card, change, and payment-method lines.`;

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
    let detail = '';
    try {
      const errJson = (await response.json()) as { error?: { message?: string } };
      detail = errJson.error?.message ? `: ${errJson.error.message}` : '';
    } catch {
      // ignore parse errors
    }
    if (response.status === 401) {
      throw new Error(`OpenAI rejected the API key (401)${detail}`);
    }
    if (response.status === 429) {
      throw new Error(`OpenAI rate limit or billing issue (429)${detail}`);
    }
    throw new Error(`Receipt scan failed (${response.status})${detail}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response — try a clearer photo.');

  const parsed = JSON.parse(content) as {
    merchant?: string;
    total?: number;
    items?: Array<{ name?: string; amount?: number; category?: string }>;
  };

  const rawItems = (parsed.items ?? [])
    .map((row, index) => normalizeItem(row.name, row.amount, row.category, `ai-${index}`))
    .filter(Boolean) as ReceiptLineItem[];

  if (!rawItems.length) throw new Error('No line items found — try a sharper photo of the receipt.');

  const { items, total } = reconcileItemsToTotal(rawItems, parsed.total);

  return {
    merchant: parsed.merchant,
    total,
    items,
    source: 'ai',
  };
}

/**
 * Analyze a receipt photo. Prefer base64 from ImagePicker.
 * Throws on missing key / missing image data / AI failure (no silent demo in production).
 * Pass `allowDemo: true` only for intentional offline demos.
 */
export async function analyzeReceiptPhoto(
  _uri: string,
  base64?: string | null,
  options?: { allowDemo?: boolean },
): Promise<ReceiptScanResult> {
  const apiKey = resolveOpenAiApiKey();
  const allowDemo = options?.allowDemo === true;

  if (!apiKey) {
    if (allowDemo) return demoRecognize();
    throw new Error(
      'Receipt scan needs an OpenAI API key. Add EXPO_PUBLIC_OPENAI_API_KEY to .env or EAS production env, then rebuild.',
    );
  }

  if (!base64) {
    throw new Error('Could not read the photo data. Try another photo or the gallery.');
  }

  return recognizeWithOpenAI(base64, apiKey);
}
