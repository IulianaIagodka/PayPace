/**
 * Pure control-panel presentation logic for PayPace.
 * Keeps Home / Status / Activity language and telemetry out of React components
 * so the resource-console metaphor can be unit-tested.
 */

import type { PaceHorizon } from '../models/calculator';
import type { DailyExpense, SafeSpendSnapshot, TrajectoryLabel } from '../models/types';

function daysLabel(count: number): string {
  const n = Math.max(0, Math.round(count));
  return n === 1 ? '1 day' : `${n} days`;
}

export const CONTROL_GRID_KEYS = ['food', 'transport', 'kids', 'fun', 'home'] as const;

export type ControlGridKey = (typeof CONTROL_GRID_KEYS)[number];

export type TelemetryTone = 'normal' | 'ok' | 'warn' | 'danger';

export type SystemChipLabel = 'SYSTEM ONLINE' | 'SYSTEM WARN' | 'SYSTEM CRITICAL';

export type StatusLabel =
  | 'CRITICAL'
  | 'LOW RESERVE'
  | 'BURN HIGH'
  | 'STABLE'
  | 'ON PACE';

export type ControlPanelView = {
  reservesLabel: string;
  reservesAmount: number;
  resourcesPct: number;
  runwayLabel: string;
  weekHint: string | null;
  recommendedPacing: number;
  burnDaily: number;
  burnHot: boolean;
  checkpointDays: number;
  statusLabel: StatusLabel;
  statusTone: TelemetryTone;
  chipLabel: SystemChipLabel;
  pacingTone: TelemetryTone;
  periodShare: number;
  isWeekHorizon: boolean;
};

/** Average daily drain this cycle (0 before any elapsed day). */
export function burnRateDaily(spentThisCycle: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return spentThisCycle / daysElapsed;
}

export function isBurnHot(burnDaily: number, recommendedPacing: number): boolean {
  return recommendedPacing > 0 && burnDaily > recommendedPacing;
}

export function systemChipLabel(
  remainingUntilPayday: number,
  isAtRisk: boolean,
): SystemChipLabel {
  if (remainingUntilPayday < 0) return 'SYSTEM CRITICAL';
  if (isAtRisk) return 'SYSTEM WARN';
  return 'SYSTEM ONLINE';
}

export function statusLabelFor(
  trajectory: TrajectoryLabel,
  burnHot: boolean,
): StatusLabel {
  if (trajectory === 'DEFICIT') return 'CRITICAL';
  if (trajectory === 'LOW RESERVE') return 'LOW RESERVE';
  if (burnHot) return 'BURN HIGH';
  if (trajectory === 'WITH RESERVE') return 'STABLE';
  return 'ON PACE';
}

export function statusToneFor(label: StatusLabel): TelemetryTone {
  if (label === 'CRITICAL') return 'danger';
  if (label === 'LOW RESERVE' || label === 'BURN HIGH') return 'warn';
  return 'ok';
}

export function reservesLabelFor(horizon: PaceHorizon): string {
  if (horizon === 'day') return 'RESERVES · TODAY';
  if (horizon === 'week') return 'RESERVES · THIS WEEK';
  return 'RESERVES · UNTIL CHECKPOINT';
}

export function reservesAmountFor(
  horizon: PaceHorizon,
  snapshot: Pick<
    SafeSpendSnapshot,
    | 'remainingUntilPayday'
    | 'safeToSpendToday'
    | 'safeToSpendThisWeek'
    | 'safeToSpendThisMonth'
  >,
): number {
  if (horizon === 'day') return Math.max(snapshot.safeToSpendToday, 0);
  if (horizon === 'week') return Math.max(snapshot.safeToSpendThisWeek, 0);
  return Math.max(snapshot.remainingUntilPayday, 0);
}

export function runwayMetaFor(
  horizon: PaceHorizon,
  snapshot: Pick<SafeSpendSnapshot, 'daysLeftInWeek' | 'daysUntilPayday'>,
): string {
  if (horizon === 'day') return 'today';
  if (horizon === 'week') {
    return `${daysLabel(snapshot.daysLeftInWeek)} left in week`;
  }
  return `${daysLabel(snapshot.daysUntilPayday)} to payday`;
}

export function weekCycleHint(
  horizon: PaceHorizon,
  cycleReserve: number,
  daysUntilPayday: number,
  formatMoney: (n: number) => string,
): string | null {
  if (horizon === 'day') {
    return `Cycle left ${formatMoney(Math.max(cycleReserve, 0))} · ${daysLabel(daysUntilPayday)} to payday`;
  }
  if (horizon !== 'week') return null;
  return `Cycle left ${formatMoney(Math.max(cycleReserve, 0))} · ${daysLabel(daysUntilPayday)} to payday`;
}

/** Pair modules into 2-col rows for the control grid. */
export function pairModuleRows<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export function isControlGridKey(key: string): boolean {
  return (CONTROL_GRID_KEYS as readonly string[]).includes(key);
}

export function filterControlGridModules<T extends { envelope: { key: string } }>(
  modules: T[],
): T[] {
  return modules.filter((m) => isControlGridKey(String(m.envelope.key)));
}

/** Newest drain events first, capped for the Home log strip. */
export function recentDrainEvents(expenses: DailyExpense[], limit = 3): DailyExpense[] {
  const list = [...expenses];
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return list.slice(0, Math.max(limit, 0));
}

export function buildControlPanelView(
  snapshot: SafeSpendSnapshot,
  horizon: PaceHorizon,
  formatMoney: (n: number) => string,
): ControlPanelView {
  const isWeek = horizon === 'week';
  const isDay = horizon === 'day';
  const recommendedPacing = Math.max(snapshot.safeToSpendToday, 0);
  const burnDaily = burnRateDaily(snapshot.spentThisCycle, snapshot.daysElapsed);
  const burnHot = isBurnHot(burnDaily, recommendedPacing);
  const statusLabel = statusLabelFor(snapshot.trajectory, burnHot);
  const cycleReserve = Math.max(snapshot.remainingUntilPayday, 0);
  const periodShare = isDay
    ? 1 / Math.max(snapshot.daysUntilPayday, 1)
    : isWeek
      ? snapshot.weekShare
      : snapshot.monthShare;

  return {
    reservesLabel: reservesLabelFor(horizon),
    reservesAmount: reservesAmountFor(horizon, snapshot),
    resourcesPct: Math.round(snapshot.resourcesRemainingRatio * 100),
    runwayLabel: runwayMetaFor(horizon, snapshot),
    weekHint: weekCycleHint(horizon, cycleReserve, snapshot.daysUntilPayday, formatMoney),
    recommendedPacing,
    burnDaily,
    burnHot,
    checkpointDays: snapshot.daysUntilPayday,
    statusLabel,
    statusTone: statusToneFor(statusLabel),
    chipLabel: systemChipLabel(snapshot.remainingUntilPayday, snapshot.isAtRisk),
    pacingTone: snapshot.remainingUntilPayday < 0 ? 'danger' : 'ok',
    periodShare,
    isWeekHorizon: isWeek,
  };
}

/** Copy / chrome contracts for the control-panel redesign. */
export const CONTROL_PANEL_COPY = {
  tabs: {
    home: 'PACE',
    activity: 'LOG',
    status: 'PACE',
    settings: 'CONFIG',
  },
  home: {
    sysTag: 'RESOURCE CONTROL // PAYDAY CYCLE',
    pacingLabel: 'RECOMMENDED PACING',
    pacingHint: 'Daily drain ceiling until next checkpoint',
    modulesLabel: 'MODULES',
    modulesPlusTitle: 'MODULES · PLUS',
    drainLogLabel: 'DRAIN LOG',
    drainEmpty: 'No drain events logged.',
    logExpense: '+ LOG EXPENSE',
    burnCriticalTitle: 'BURN RATE CRITICAL',
  },
  status: {
    title: 'PACE',
    sysTag: 'TELEMETRY // CYCLE HEALTH',
    poolLabel: 'RESOURCE POOL',
    trajectoryLabel: 'TRAJECTORY',
    timelineLabel: 'CHECKPOINT TIMELINE',
  },
  activity: {
    title: 'DRAIN LOG',
    sysTag: 'EXPENSE EVENTS // THIS CYCLE',
    totalLabel: 'TOTAL DRAIN',
    feedLabel: 'EVENT FEED',
    empty: 'No drain events yet.',
  },
  onboarding: {
    title: 'Your money control panel.\nSurvive until payday.',
    cta: 'INITIALIZE',
    enter: 'ENTER CONTROL PANEL',
    ready: 'SYSTEM READY',
  },
  addExpenseTitle: 'LOG EXPENSE',
  allocateTitle: 'MODULES',
} as const;
