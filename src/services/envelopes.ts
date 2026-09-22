import type { CustomCategory, Envelope, ExpenseCategory, PayCycle } from '../models/types';
import { asMoney } from './formatting';
import { colorForTone, toneForRatio, type ResourceTone } from '../theme/colors';
import { newId } from './id';
import { isBuiltinCategory } from './categories';

export type EnvelopeKey = 'food' | 'transport' | 'kids' | 'fun' | 'home' | 'other' | (string & {});

export const ENVELOPE_DEFAULTS: Array<{
  key: EnvelopeKey;
  title: string;
  category: ExpenseCategory;
  share: number;
}> = [
  { key: 'food', title: 'FOOD', category: 'groceries', share: 0.26 },
  { key: 'fun', title: 'EAT OUT', category: 'food', share: 0.12 },
  { key: 'transport', title: 'TRANSPORT', category: 'transport', share: 0.12 },
  { key: 'kids', title: 'KIDS', category: 'childcare', share: 0.18 },
  { key: 'home', title: 'HOME', category: 'utilities', share: 0.2 },
  { key: 'other', title: 'OTHER', category: 'other', share: 0.12 },
];

export function defaultEnvelopes(totalSpendPool: number): Envelope[] {
  const pool = Math.max(asMoney(totalSpendPool), 0);
  let allocated = 0;
  return ENVELOPE_DEFAULTS.map((def, index) => {
    const isLast = index === ENVELOPE_DEFAULTS.length - 1;
    const amount = isLast
      ? Math.max(pool - allocated, 0)
      : Math.round(pool * def.share);
    allocated += amount;
    return {
      id: newId(),
      key: def.key,
      title: def.title,
      category: def.category,
      allocated: amount,
    };
  });
}

/** Ensure envelopes exist; rename legacy FUN → EAT OUT when still default. */
export function ensureEnvelopes(cycle: PayCycle): Envelope[] {
  if (cycle.envelopes?.length) {
    return cycle.envelopes.map((e) => {
      if (e.key === 'fun' && (e.title === 'FUN' || !e.title)) {
        return { ...e, title: 'EAT OUT', category: e.category || 'food' };
      }
      return e;
    });
  }
  const metricsPool =
    asMoney(cycle.currentBalance) -
    cycle.bills.filter((b) => !b.isPaid).reduce((s, b) => s + asMoney(b.amount), 0) -
    asMoney(cycle.savingsGoal) -
    asMoney(cycle.emergencyBuffer) -
    asMoney(cycle.spendingBuffer);
  return defaultEnvelopes(Math.max(metricsPool, 0));
}

export function spentInEnvelope(cycle: PayCycle, envelope: Envelope): number {
  return cycle.expenses
    .filter((e) => (e.category ?? 'other') === envelope.category || e.envelopeKey === envelope.key)
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

export function unallocatedAmount(cycle: PayCycle, spendPool: number): number {
  const allocated = ensureEnvelopes(cycle).reduce((s, e) => s + asMoney(e.allocated), 0);
  return asMoney(spendPool) - allocated;
}

export function categoryToEnvelopeKey(category?: ExpenseCategory): EnvelopeKey {
  if (!category) return 'other';
  if (!isBuiltinCategory(category)) return category;
  const hit = ENVELOPE_DEFAULTS.find((d) => d.category === category);
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
