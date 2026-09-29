/**
 * Weekly / monthly spending reports by category.
 * Pure module (date-fns only) so Node tests can run without Metro resolution.
 * Generated after a period ends; saved on Pace for later review.
 */

import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { WeekStartsOn } from '../models/calculator';
import type {
  CustomCategory,
  DailyExpense,
  ExpenseCategory,
  PayCycle,
  PeriodReport,
  PeriodReportCategory,
  PeriodReportKind,
} from '../models/types';

/** Share of period spend that marks a category as concentrated / slipping. */
export const SLIP_SHARE_THRESHOLD = 0.28;

const BUILTIN_TITLES: Record<string, string> = {
  home: 'Home',
  groceries: 'Groceries',
  food: 'Eating out',
  transport: 'Transport',
  shopping: 'Shopping',
  kids: 'Kids',
  health: 'Health',
  fun: 'Fun',
  travel: 'Travel',
  subscriptions: 'Subscriptions',
  other: 'Other',
};

const BUILTIN_ORDER = [
  'home',
  'groceries',
  'food',
  'transport',
  'shopping',
  'kids',
  'health',
  'fun',
  'travel',
  'subscriptions',
  'other',
] as const;

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  rent: 'home',
  utilities: 'home',
  childcare: 'kids',
  loan: 'other',
};

function dateKey(date: Date): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

function parseDateKey(value: string): Date {
  const key = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (match) {
    return startOfDay(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  return startOfDay(new Date(value));
}

function money(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeCategory(category?: string | null): ExpenseCategory {
  if (!category) return 'other';
  if (LEGACY_CATEGORY_MAP[category]) return LEGACY_CATEGORY_MAP[category]!;
  if (category in BUILTIN_TITLES) return category;
  return category;
}

function categoryLabel(category: ExpenseCategory, custom: CustomCategory[]): string {
  const normalized = normalizeCategory(category);
  if (normalized in BUILTIN_TITLES) return BUILTIN_TITLES[normalized]!;
  const hit = custom.find((c) => c.id === category || c.id === normalized);
  return hit?.title ?? 'Custom';
}

function allCategoryIds(custom: CustomCategory[]): ExpenseCategory[] {
  const customIds = custom.map((c) => c.id);
  const builtins = BUILTIN_ORDER.filter((c) => c !== 'other');
  return [...builtins, ...customIds, 'other'];
}

export function reportPeriodKey(kind: PeriodReportKind, periodStart: string): string {
  return `${kind}:${periodStart.slice(0, 10)}`;
}

export function previousWeekWindow(
  now: Date,
  weekStartsOn: WeekStartsOn,
): { start: Date; end: Date } {
  const thisWeekStart = startOfWeek(now, { weekStartsOn });
  const prevStart = subWeeks(thisWeekStart, 1);
  const prevEnd = endOfWeek(prevStart, { weekStartsOn });
  return { start: prevStart, end: prevEnd };
}

export function previousMonthWindow(now: Date): { start: Date; end: Date } {
  const prev = subMonths(startOfMonth(now), 1);
  return { start: prev, end: endOfMonth(prev) };
}

/** True once the previous calendar week has fully ended (we're in a new week). */
export function isPreviousWeekComplete(now: Date, weekStartsOn: WeekStartsOn): boolean {
  const { end } = previousWeekWindow(now, weekStartsOn);
  return startOfWeek(now, { weekStartsOn }) > end;
}

/** True once the previous calendar month has fully ended. */
export function isPreviousMonthComplete(now: Date): boolean {
  return startOfMonth(now) > endOfMonth(subMonths(startOfMonth(now), 1));
}

function expensesInRange(
  cycles: PayCycle[],
  startKey: string,
  endKey: string,
): DailyExpense[] {
  const out: DailyExpense[] = [];
  for (const cycle of cycles) {
    for (const expense of cycle.expenses ?? []) {
      const key = expense.date.slice(0, 10);
      if (key >= startKey && key <= endKey) out.push(expense);
    }
  }
  return out;
}

function allocatedByCategory(cycles: PayCycle[]): Map<ExpenseCategory, number> {
  const map = new Map<ExpenseCategory, number>();
  for (const cycle of cycles) {
    for (const envelope of cycle.envelopes ?? []) {
      const category = normalizeCategory(envelope.category ?? String(envelope.key));
      map.set(category, (map.get(category) ?? 0) + money(envelope.allocated));
    }
  }
  return map;
}

export function isCategorySlipping(input: {
  spent: number;
  allocated: number;
  share: number;
}): boolean {
  if (input.spent <= 0) return false;
  if (input.allocated > 0 && input.spent > input.allocated + 0.005) return true;
  if (input.share >= SLIP_SHARE_THRESHOLD) return true;
  return false;
}

export function buildPeriodReport(input: {
  kind: PeriodReportKind;
  periodStart: string;
  periodEnd: string;
  cycles: PayCycle[];
  customCategories?: CustomCategory[];
  createdAt?: string;
}): PeriodReport | null {
  const custom = input.customCategories ?? [];
  const startKey = input.periodStart.slice(0, 10);
  const endKey = input.periodEnd.slice(0, 10);
  const expenses = expensesInRange(input.cycles, startKey, endKey);
  const totalSpent = expenses.reduce((sum, e) => sum + Math.max(money(e.amount), 0), 0);
  if (totalSpent <= 0) return null;

  const ids = allCategoryIds(custom);
  const totals = new Map<ExpenseCategory, number>();
  for (const id of ids) totals.set(id, 0);
  for (const expense of expenses) {
    const category = normalizeCategory(expense.category);
    totals.set(category, (totals.get(category) ?? 0) + Math.max(money(expense.amount), 0));
  }

  const allocated = allocatedByCategory(input.cycles);
  const categories: PeriodReportCategory[] = ids
    .map((category) => {
      const spent = totals.get(category) ?? 0;
      const planned = allocated.get(category) ?? 0;
      const share = totalSpent > 0 ? spent / totalSpent : 0;
      return {
        category,
        title: categoryLabel(category, custom),
        spent,
        allocated: planned,
        share,
        slipping: isCategorySlipping({ spent, allocated: planned, share }),
      };
    })
    .filter((row) => row.spent > 0 || row.allocated > 0)
    .sort((a, b) => {
      if (a.slipping !== b.slipping) return a.slipping ? -1 : 1;
      return b.spent - a.spent;
    });

  const slipping = categories.filter((c) => c.slipping);
  const summary =
    slipping.length === 0
      ? 'No category slipped this period.'
      : slipping.length === 1
        ? `${slipping[0]!.title} slipped — check that pace.`
        : `${slipping
            .slice(0, 3)
            .map((c) => c.title)
            .join(', ')}${slipping.length > 3 ? '…' : ''} slipped.`;

  return {
    id: reportPeriodKey(input.kind, startKey),
    kind: input.kind,
    periodStart: startKey,
    periodEnd: endKey,
    createdAt: input.createdAt ?? new Date().toISOString(),
    totalSpent,
    categories,
    summary,
    viewedAt: null,
    awaitingPrompt: true,
  };
}

export function duePeriodWindows(
  now: Date,
  weekStartsOn: WeekStartsOn,
): Array<{ kind: PeriodReportKind; start: Date; end: Date }> {
  const due: Array<{ kind: PeriodReportKind; start: Date; end: Date }> = [];
  if (isPreviousWeekComplete(now, weekStartsOn)) {
    const week = previousWeekWindow(now, weekStartsOn);
    due.push({ kind: 'week', start: week.start, end: week.end });
  }
  if (isPreviousMonthComplete(now)) {
    const month = previousMonthWindow(now);
    due.push({ kind: 'month', start: month.start, end: month.end });
  }
  return due;
}

/**
 * Build any missing week/month reports for completed periods.
 * Skips periods with no spending. Idempotent by report id.
 */
export function collectNewPeriodReports(input: {
  cycles: PayCycle[];
  existing: PeriodReport[];
  customCategories?: CustomCategory[];
  weekStartsOn?: WeekStartsOn;
  now?: Date;
  createdAt?: string;
}): PeriodReport[] {
  const now = input.now ?? new Date();
  const weekStartsOn = input.weekStartsOn ?? 1;
  const existingIds = new Set(input.existing.map((r) => r.id));
  const created: PeriodReport[] = [];

  for (const window of duePeriodWindows(now, weekStartsOn)) {
    const periodStart = dateKey(window.start);
    const periodEnd = dateKey(window.end);
    const id = reportPeriodKey(window.kind, periodStart);
    if (existingIds.has(id)) continue;
    const report = buildPeriodReport({
      kind: window.kind,
      periodStart,
      periodEnd,
      cycles: input.cycles,
      customCategories: input.customCategories,
      createdAt: input.createdAt,
    });
    if (!report) continue;
    created.push(report);
    existingIds.add(report.id);
  }

  return created;
}

export function mergePeriodReports(
  existing: PeriodReport[],
  incoming: PeriodReport[],
  limit = 24,
): PeriodReport[] {
  const map = new Map<string, PeriodReport>();
  for (const report of existing) map.set(report.id, report);
  for (const report of incoming) {
    const prev = map.get(report.id);
    map.set(report.id, prev ? { ...report, viewedAt: prev.viewedAt ?? report.viewedAt } : report);
  }
  return Array.from(map.values())
    .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function markReportViewed(
  reports: PeriodReport[],
  reportId: string,
  viewedAt = new Date().toISOString(),
): PeriodReport[] {
  return reports.map((r) =>
    r.id === reportId
      ? { ...r, viewedAt: r.viewedAt ?? viewedAt, awaitingPrompt: false }
      : r,
  );
}

export function dismissReportPromptFlag(
  reports: PeriodReport[],
  reportId: string,
): PeriodReport[] {
  return reports.map((r) => (r.id === reportId ? { ...r, awaitingPrompt: false } : r));
}

export function nextAwaitingPromptReport(reports: PeriodReport[]): PeriodReport | null {
  const awaiting = reports.filter((r) => r.awaitingPrompt);
  if (awaiting.length === 0) return null;
  return [...awaiting].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0] ?? null;
}

export function formatReportPeriodLabel(report: PeriodReport): string {
  const start = parseDateKey(report.periodStart);
  const end = parseDateKey(report.periodEnd);
  if (report.kind === 'month') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function reportKindLabel(kind: PeriodReportKind): string {
  return kind === 'week' ? 'WEEKLY' : 'MONTHLY';
}

/** Prompt copy when a fresh report lands. */
export function reportReadyPrompt(report: PeriodReport): { title: string; body: string } {
  const kind = report.kind === 'week' ? 'Weekly' : 'Monthly';
  return {
    title: `${kind} report ready`,
    body: `${report.summary} View it now, or find it later on the Pace tab.`,
  };
}

/** Next calendar instant after a period ends — useful for notifications / tests. */
export function periodBoundaryAfter(end: Date): Date {
  return addDays(end, 1);
}
