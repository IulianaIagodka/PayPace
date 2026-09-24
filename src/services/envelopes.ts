import type { CustomCategory, Envelope, ExpenseCategory, PayCycle } from '../models/types';
import { asMoney } from './formatting';
import { colorForTone, toneForRatio, type ResourceTone } from '../theme/colors';
import { newId } from './id';
import {
  BUILTIN_CATEGORIES,
  CATEGORY_META,
  isBuiltinCategory,
  normalizeCategory,
  shouldShowCategory,
} from './categories';

export type EnvelopeKey = import('../models/types').EnvelopeKey;

export const ENVELOPE_DEFAULTS: Array<{
  key: EnvelopeKey;
  title: string;
  category: ExpenseCategory;
}> = BUILTIN_CATEGORIES.map((category) => ({
  key: category,
  title: CATEGORY_META[category].title.toUpperCase(),
  category,
}));

/** Create the full default set with zero allocations (user fills what they use). */
export function defaultEnvelopes(_totalSpendPool = 0): Envelope[] {
  return ENVELOPE_DEFAULTS.map((def) => ({
    id: newId(),
    key: def.key,
    title: def.title,
    category: def.category,
    allocated: 0,
  }));
}

function migrateEnvelope(envelope: Envelope): Envelope {
  const rawCategory = envelope.category ?? String(envelope.key);
  const rawKey = String(envelope.key);
  const rawTitle = (envelope.title ?? '').toUpperCase();

  let key = rawKey;
  let category = normalizeCategory(rawCategory);

  // Legacy: key "food" held groceries; key "fun" held eating out.
  if (rawKey === 'food' && (rawCategory === 'groceries' || rawTitle === 'FOOD')) {
    key = 'groceries';
    category = 'groceries';
  } else if (rawKey === 'fun' && (rawCategory === 'food' || rawTitle === 'EAT OUT')) {
    key = 'food';
    category = 'food';
  } else if (rawKey === 'childcare' || rawCategory === 'childcare') {
    key = 'kids';
    category = 'kids';
  } else if (
    rawKey === 'utilities' ||
    rawKey === 'rent' ||
    rawCategory === 'utilities' ||
    rawCategory === 'rent'
  ) {
    key = 'home';
    category = 'home';
  } else if (rawKey === 'loan' || rawCategory === 'loan') {
    key = 'other';
    category = 'other';
  } else {
    key = String(normalizeCategory(rawKey));
    category = normalizeCategory(rawCategory);
  }

  return {
    ...envelope,
    key,
    category,
    title: isBuiltinCategory(key)
      ? key === 'food'
        ? 'EATING OUT'
        : CATEGORY_META[key].title.toUpperCase()
      : envelope.title || 'CUSTOM',
  };
}

/**
 * Ensure every default category exists as an envelope.
 * Preserves user allocations; adds missing categories at 0.
 */
export function ensureEnvelopes(cycle: PayCycle): Envelope[] {
  const migrated = (cycle.envelopes?.length ? cycle.envelopes : []).map(migrateEnvelope);

  const byKey = new Map<string, Envelope>();
  for (const envelope of migrated) {
    const key = String(envelope.key);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, envelope);
      continue;
    }
    byKey.set(key, {
      ...prev,
      allocated: asMoney(prev.allocated) + asMoney(envelope.allocated),
    });
  }

  const builtins = ENVELOPE_DEFAULTS.map((def) => {
    const existing = byKey.get(String(def.key));
    if (existing) {
      return {
        ...existing,
        key: def.key,
        category: def.category,
        title: def.title,
      };
    }
    return {
      id: newId(),
      key: def.key,
      title: def.title,
      category: def.category,
      allocated: 0,
    };
  });

  const customs = [...byKey.entries()]
    .filter(([key]) => !isBuiltinCategory(key))
    .map(([, envelope]) => envelope);

  return [...builtins, ...customs];
}

export function spentInEnvelope(cycle: PayCycle, envelope: Envelope): number {
  const envelopeCategory = normalizeCategory(envelope.category);
  return cycle.expenses
    .filter((e) => {
      const cat = normalizeCategory(e.category);
      return cat === envelopeCategory || e.envelopeKey === envelope.key;
    })
    .reduce((s, e) => s + Math.max(asMoney(e.amount), 0), 0);
}

export type EnvelopeStatus = {
  envelope: Envelope;
  spent: number;
  remaining: number;
  ratioRemaining: number;
  load: number;
  tone: ResourceTone;
  color: string;
  depleted: boolean;
  warning: boolean;
};

export function envelopeStatuses(cycle: PayCycle): EnvelopeStatus[] {
  return ensureEnvelopes(cycle).map((envelope) => {
    const spent = spentInEnvelope(cycle, envelope);
    const allocated = Math.max(asMoney(envelope.allocated), 0);
    const remaining = allocated - spent;
    const ratioRemaining = allocated > 0 ? Math.max(remaining, 0) / allocated : 0;
    const load = allocated > 0 ? Math.min(spent / allocated, 1.5) : spent > 0 ? 1 : 0;
    const tone = remaining <= 0 && allocated > 0 ? 'critical' : toneForRatio(ratioRemaining);
    return {
      envelope,
      spent,
      remaining,
      ratioRemaining,
      load,
      tone,
      color: colorForTone(tone),
      depleted: remaining <= 0 && allocated > 0,
      warning: ratioRemaining > 0 && ratioRemaining < 0.15,
    };
  });
}

/** Home / balance lists: only spent or user-allocated categories. */
export function envelopesForDisplay(cycle: PayCycle): EnvelopeStatus[] {
  return envelopeStatuses(cycle).filter((row) =>
    shouldShowCategory(row.spent, asMoney(row.envelope.allocated)),
  );
}

export function unallocatedAmount(cycle: PayCycle, spendPool: number): number {
  const allocated = ensureEnvelopes(cycle).reduce((s, e) => s + asMoney(e.allocated), 0);
  return asMoney(spendPool) - allocated;
}

export function categoryToEnvelopeKey(category?: ExpenseCategory): EnvelopeKey {
  const normalized = normalizeCategory(category);
  if (!isBuiltinCategory(normalized)) return normalized;
  const hit = ENVELOPE_DEFAULTS.find((d) => d.category === normalized);
  return hit?.key ?? 'other';
}

export function makeCustomEnvelope(custom: CustomCategory): Envelope {
  return {
    id: newId(),
    key: custom.id,
    title: custom.title.trim().toUpperCase().slice(0, 16) || 'CUSTOM',
    category: custom.id,
    allocated: 0,
  };
}
