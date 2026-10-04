import type { ExpenseScope, HouseholdActivityEvent, HouseholdActivityKind } from '../models/types';

function activityId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `act_${Math.random().toString(16).slice(2)}`;
  } catch {
    return `act_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  }
}

/** Lightweight money label for activity lines (keeps this module Node-testable). */
function moneyLabel(amount: number, currencyCode: string): string {
  const n = Math.round(Number(amount) || 0);
  const abs = Math.abs(n).toLocaleString('uk-UA');
  const sign = n < 0 ? '−' : '';
  return `${sign}${abs} ${currencyCode}`;
}

type BuildActivityInput = {
  kind: HouseholdActivityKind;
  memberId?: string;
  memberName?: string;
  summary: string;
  expenseId?: string;
  billId?: string;
  amount?: number;
  beforeAmount?: number;
  afterAmount?: number;
  scope?: ExpenseScope;
  id?: string;
  at?: string;
};

export function buildActivityEvent(input: BuildActivityInput): HouseholdActivityEvent {
  return {
    id: input.id ?? activityId(),
    kind: input.kind,
    at: input.at ?? new Date().toISOString(),
    memberId: input.memberId,
    memberName: input.memberName,
    summary: input.summary,
    expenseId: input.expenseId,
    billId: input.billId,
    amount: input.amount,
    beforeAmount: input.beforeAmount,
    afterAmount: input.afterAmount,
    scope: input.scope,
  };
}

function who(name?: string): string {
  return name?.trim() || 'Someone';
}

export function expenseAddedSummary(
  name: string,
  amount: number,
  currencyCode: string,
  memberName?: string,
  scope?: ExpenseScope,
): string {
  const tag = scope === 'personal' ? ' (personal)' : '';
  return `${who(memberName)} logged ${name} · ${moneyLabel(amount, currencyCode)}${tag}`;
}

export function expenseDeletedSummary(
  name: string,
  amount: number,
  currencyCode: string,
  memberName?: string,
): string {
  return `${who(memberName)} deleted ${name} · ${moneyLabel(amount, currencyCode)}`;
}

export function balanceChangedSummary(
  before: number,
  after: number,
  currencyCode: string,
  memberName?: string,
): string {
  return `${who(memberName)} set balance ${moneyLabel(before, currencyCode)} → ${moneyLabel(after, currencyCode)}`;
}

export function billAddedSummary(
  name: string,
  amount: number,
  currencyCode: string,
  memberName?: string,
): string {
  return `${who(memberName)} added bill ${name} · ${moneyLabel(amount, currencyCode)}`;
}

export function billUpdatedSummary(
  name: string,
  amount: number,
  currencyCode: string,
  memberName?: string,
  paid?: boolean,
): string {
  if (paid) {
    return `${who(memberName)} marked ${name} paid · ${moneyLabel(amount, currencyCode)}`;
  }
  return `${who(memberName)} updated bill ${name} · ${moneyLabel(amount, currencyCode)}`;
}

export function billDeletedSummary(
  name: string,
  amount: number,
  currencyCode: string,
  memberName?: string,
): string {
  return `${who(memberName)} deleted bill ${name} · ${moneyLabel(amount, currencyCode)}`;
}
