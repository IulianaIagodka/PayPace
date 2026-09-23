/**
 * Unit tests for the resource control-panel redesign.
 * Run: npm run test:control
 *
 * Pure modules only (Node ESM + strip-types cannot resolve extensionless
 * app imports like calculator → formatting).
 */

import type { DailyExpense, SafeSpendSnapshot } from '../src/models/types.ts';
import {
  CONTROL_GRID_KEYS,
  CONTROL_PANEL_COPY,
  buildControlPanelView,
  burnRateDaily,
  filterControlGridModules,
  isBurnHot,
  isControlGridKey,
  pairModuleRows,
  recentDrainEvents,
  reservesAmountFor,
  reservesLabelFor,
  runwayMetaFor,
  statusLabelFor,
  statusToneFor,
  systemChipLabel,
  weekCycleHint,
} from '../src/services/controlPanel.ts';
import {
  colorForTone,
  colors,
  segmentColor,
  toneForRatio,
} from '../src/theme/colors.ts';

let passed = 0;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
}

function assertEq<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(
      `FAIL: ${msg} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`,
    );
  }
  passed += 1;
}

function section(name: string) {
  console.log(`\n▸ ${name}`);
}

function snap(partial: Partial<SafeSpendSnapshot> = {}): SafeSpendSnapshot {
  return {
    remainingUntilPayday: 4000,
    safeToSpendToday: 200,
    todayAllowance: 200,
    spentToday: 0,
    safeToSpendThisWeek: 1000,
    safeToSpendThisMonth: 4000,
    daysLeftInWeek: 5,
    daysLeftInMonth: 20,
    weekShare: 0.25,
    monthShare: 1,
    daysUntilPayday: 20,
    totalDaysInCycle: 29,
    daysElapsed: 9,
    cycleProgress: 9 / 29,
    unpaidBillsTotal: 0,
    spentThisCycle: 900,
    reservedTotal: 300,
    isAtRisk: false,
    projectedShortfallDays: null,
    resourcesRemainingRatio: 0.8,
    trajectory: 'ON TARGET',
    projectedEndBalance: 2000,
    ...partial,
  };
}

section('theme · resource tones');
assertEq(toneForRatio(1), 'healthy', 'full reserves are healthy');
assertEq(toneForRatio(0.4), 'healthy', '0.4 still healthy');
assertEq(toneForRatio(0.39), 'warning', 'under 0.4 warns');
assertEq(toneForRatio(0.15), 'warning', '0.15 still warning');
assertEq(toneForRatio(0.149), 'danger', 'under 0.15 danger');
assertEq(toneForRatio(0), 'critical', 'empty is critical');
assertEq(toneForRatio(-1), 'critical', 'negative ratio critical');
assertEq(colorForTone('healthy'), colors.resource, 'healthy color');
assertEq(colorForTone('warning'), colors.warning, 'warning color');
assertEq(colorForTone('danger'), colors.danger, 'danger color');
assertEq(colorForTone('critical'), colors.critical, 'critical color');
assertEq(colorForTone('empty'), colors.border, 'empty tone uses border');
assertEq(segmentColor(3, 3, 'healthy'), '#12100C', 'unlit segment dark');
assertEq(segmentColor(2, 3, 'healthy'), colors.warning, 'healthy tip amber');
assertEq(segmentColor(1, 3, 'healthy'), colors.resource, 'healthy body green');
assertEq(segmentColor(0, 2, 'danger'), colors.danger, 'danger lit segment');

section('theme · control-panel palette invariants');
assert(colors.bg.startsWith('#'), 'bg hex');
assert(colors.resource === colors.healthy, 'resource aliases healthy');
assert(colors.bg !== '#FFFFFF' && colors.bg !== '#fff', 'not light fintech bg');
assert(!['#F4F1EA', '#f4f1ea'].includes(colors.bg), 'not cream wellness bg');
assert(colors.panel !== colors.bg, 'panel distinct from bg');
assert(colors.borderBright !== colors.border, 'bright border for industrial framing');

section('controlPanel · burn + chip + status');
assertEq(burnRateDaily(900, 9), 100, 'burn = spent / days');
assertEq(burnRateDaily(500, 0), 0, 'no elapsed days → 0 burn');
assertEq(burnRateDaily(500, -2), 0, 'negative days → 0 burn');
assert(isBurnHot(250, 200), 'burn above pace is hot');
assert(!isBurnHot(150, 200), 'burn under pace is cool');
assert(!isBurnHot(250, 0), 'zero pace never hot');
assertEq(systemChipLabel(-10, false), 'SYSTEM CRITICAL', 'negative reserves critical chip');
assertEq(systemChipLabel(100, true), 'SYSTEM WARN', 'at-risk warn chip');
assertEq(systemChipLabel(100, false), 'SYSTEM ONLINE', 'healthy online chip');
assertEq(statusLabelFor('DEFICIT', false), 'CRITICAL', 'deficit → CRITICAL');
assertEq(statusLabelFor('LOW RESERVE', false), 'LOW RESERVE', 'low reserve label');
assertEq(statusLabelFor('ON TARGET', true), 'BURN HIGH', 'hot burn overrides on-target');
assertEq(statusLabelFor('WITH RESERVE', false), 'STABLE', 'with reserve → STABLE');
assertEq(statusLabelFor('ON TARGET', false), 'ON PACE', 'on target → ON PACE');
assertEq(statusToneFor('CRITICAL'), 'danger', 'critical tone');
assertEq(statusToneFor('BURN HIGH'), 'warn', 'burn high tone');
assertEq(statusToneFor('LOW RESERVE'), 'warn', 'low reserve tone');
assertEq(statusToneFor('STABLE'), 'ok', 'stable tone');
assertEq(statusToneFor('ON PACE'), 'ok', 'on pace tone');

section('controlPanel · reserves / runway / horizon');
assertEq(reservesLabelFor('week'), 'RESERVES · THIS WEEK', 'week reserves label');
assertEq(reservesLabelFor('month'), 'RESERVES · UNTIL CHECKPOINT', 'month reserves label');
assertEq(reservesLabelFor('day'), 'RESERVES · TODAY', 'day reserves label');
assertEq(reservesAmountFor('week', snap()), 1000, 'week uses week safe');
assertEq(reservesAmountFor('month', snap()), 4000, 'month uses remaining');
assertEq(reservesAmountFor('day', snap()), 200, 'day uses safe today');
assertEq(reservesAmountFor('month', snap({ remainingUntilPayday: -50 })), 0, 'floor at 0');
assertEq(runwayMetaFor('week', snap()), '5 days left in week', 'week runway meta');
assertEq(runwayMetaFor('month', snap()), '20 days to payday', 'month runway meta');
assertEq(runwayMetaFor('day', snap()), 'today', 'day runway meta');
assertEq(
  weekCycleHint('week', 4000, 20, (n) => `$${n}`),
  'Cycle left $4000 · 20 days to payday',
  'week hint text',
);
assertEq(weekCycleHint('month', 4000, 20, (n) => `$${n}`), null, 'month has no week hint');
assert(
  weekCycleHint('day', 4000, 20, (n) => `$${n}`)?.includes('Cycle left') === true,
  'day still shows cycle hint',
);

section('controlPanel · module grid helpers');
assert(CONTROL_GRID_KEYS.length === 5, 'five core modules');
assert(isControlGridKey('food'), 'food is grid key');
assert(isControlGridKey('fun'), 'fun/eat-out is grid key');
assert(!isControlGridKey('other'), 'other stays off home grid');
assert(!isControlGridKey('custom'), 'custom off grid');
{
  const modules = [
    { envelope: { key: 'food' } },
    { envelope: { key: 'other' } },
    { envelope: { key: 'home' } },
    { envelope: { key: 'transport' } },
  ];
  const filtered = filterControlGridModules(modules);
  assertEq(filtered.length, 3, 'filters to control keys');
  assertEq(filtered.map((m) => m.envelope.key).join(','), 'food,home,transport', 'order preserved');
  const rows = pairModuleRows(filtered);
  assertEq(rows.length, 2, 'pairs into 2 rows');
  assertEq(rows[0]!.length, 2, 'first row full');
  assertEq(rows[1]!.length, 1, 'last row odd → hazard empty slot');
  assertEq(pairModuleRows([]).length, 0, 'empty modules → no rows');

  const five = CONTROL_GRID_KEYS.map((key) => ({ envelope: { key } }));
  const fiveRows = pairModuleRows(five);
  assertEq(fiveRows.length, 3, '5 modules → 3 rows');
  assertEq(fiveRows[2]!.length, 1, 'last row needs EmptyCell');
}

section('controlPanel · drain log ordering');
{
  const expenses: DailyExpense[] = [
    { id: '1', name: 'A', amount: 10, date: '2026-09-10' },
    { id: '2', name: 'B', amount: 20, date: '2026-09-20' },
    { id: '3', name: 'C', amount: 30, date: '2026-09-15' },
    { id: '4', name: 'D', amount: 40, date: '2026-09-21' },
  ];
  const recent = recentDrainEvents(expenses, 3);
  assertEq(recent.map((e) => e.id).join(','), '4,2,3', 'newest first, capped at 3');
  assertEq(recentDrainEvents([], 3).length, 0, 'empty log');
  assertEq(recentDrainEvents(expenses, 0).length, 0, 'zero limit');
}

section('controlPanel · buildControlPanelView');
{
  const healthy = buildControlPanelView(snap(), 'month', (n) => `${n}`);
  assertEq(healthy.chipLabel, 'SYSTEM ONLINE', 'view chip online');
  assertEq(healthy.statusLabel, 'ON PACE', 'view status on pace');
  assertEq(healthy.statusTone, 'ok', 'view tone ok');
  assertEq(healthy.reservesLabel, 'RESERVES · UNTIL CHECKPOINT', 'view month reserves label');
  assertEq(healthy.reservesAmount, 4000, 'view reserves amount');
  assertEq(healthy.resourcesPct, 80, 'view pct');
  assertEq(healthy.runwayLabel, '20 days to payday', 'view runway');
  assertEq(healthy.weekHint, null, 'month weekHint null');
  assertEq(healthy.recommendedPacing, 200, 'view pacing');
  assertEq(healthy.burnDaily, 100, 'view burn');
  assert(!healthy.burnHot, 'view burn not hot');
  assertEq(healthy.periodShare, 1, 'month period share');
  assert(!healthy.isWeekHorizon, 'not week horizon');

  const week = buildControlPanelView(snap(), 'week', (n) => `PLN ${n}`);
  assertEq(week.reservesLabel, 'RESERVES · THIS WEEK', 'week label');
  assertEq(week.reservesAmount, 1000, 'week amount');
  assertEq(week.runwayLabel, '5 days left in week', 'week runway');
  assert(week.weekHint?.includes('Cycle left'), 'week hint present');
  assertEq(week.periodShare, 0.25, 'week share');
  assert(week.isWeekHorizon, 'week horizon flag');

  const hot = buildControlPanelView(
    snap({ spentThisCycle: 3000, daysElapsed: 5, safeToSpendToday: 200, trajectory: 'ON TARGET' }),
    'month',
    (n) => `${n}`,
  );
  assert(hot.burnHot, 'hot burn detected');
  assertEq(hot.statusLabel, 'BURN HIGH', 'hot → BURN HIGH');
  assertEq(hot.statusTone, 'warn', 'hot → warn');

  const critical = buildControlPanelView(
    snap({ remainingUntilPayday: -20, isAtRisk: true, trajectory: 'DEFICIT' }),
    'month',
    (n) => `${n}`,
  );
  assertEq(critical.chipLabel, 'SYSTEM CRITICAL', 'critical chip');
  assertEq(critical.statusLabel, 'CRITICAL', 'critical status');
  assertEq(critical.pacingTone, 'danger', 'pacing danger when negative');
  assertEq(critical.reservesAmount, 0, 'reserves floored');

  const warn = buildControlPanelView(
    snap({ isAtRisk: true, projectedShortfallDays: 4, trajectory: 'LOW RESERVE' }),
    'month',
    (n) => `${n}`,
  );
  assertEq(warn.chipLabel, 'SYSTEM WARN', 'warn chip');
  assertEq(warn.statusLabel, 'LOW RESERVE', 'low reserve status');

  const stable = buildControlPanelView(
    snap({ trajectory: 'WITH RESERVE', spentThisCycle: 100, daysElapsed: 10, safeToSpendToday: 200 }),
    'month',
    (n) => `${n}`,
  );
  assertEq(stable.statusLabel, 'STABLE', 'with reserve → STABLE');
}

section('controlPanel · copy contracts (screens / chrome)');
assertEq(CONTROL_PANEL_COPY.tabs.home, 'PACE', 'tab PACE');
assertEq(CONTROL_PANEL_COPY.tabs.activity, 'TRANSACTION', 'tab TRANSACTION');
assertEq(CONTROL_PANEL_COPY.tabs.status, 'PACE', 'tab PACE status');
assertEq(CONTROL_PANEL_COPY.tabs.settings, 'CONFIG', 'tab CONFIG');
assertEq(CONTROL_PANEL_COPY.home.pacingLabel, 'RECOMMENDED PACING', 'pacing label');
assertEq(CONTROL_PANEL_COPY.home.modulesLabel, 'MODULES', 'modules label');
assertEq(CONTROL_PANEL_COPY.home.drainLogLabel, 'TRANSACTION', 'drain log');
assertEq(CONTROL_PANEL_COPY.home.logExpense, '+ LOG EXPENSE', 'log expense CTA');
assertEq(CONTROL_PANEL_COPY.home.burnCriticalTitle, 'BURN RATE CRITICAL', 'burn alert');
assertEq(CONTROL_PANEL_COPY.home.modulesPlusTitle, 'MODULES · PLUS', 'plus upsell title');
assertEq(CONTROL_PANEL_COPY.home.drainEmpty, 'No expenses yet.', 'drain empty');
assertEq(CONTROL_PANEL_COPY.status.title, 'PACE', 'status title');
assertEq(CONTROL_PANEL_COPY.status.sysTag, 'TELEMETRY // CYCLE HEALTH', 'status sys tag');
assertEq(CONTROL_PANEL_COPY.status.poolLabel, 'RESOURCE POOL', 'pool label');
assertEq(CONTROL_PANEL_COPY.status.trajectoryLabel, 'TRAJECTORY', 'trajectory label');
assertEq(CONTROL_PANEL_COPY.status.timelineLabel, 'CHECKPOINT TIMELINE', 'timeline label');
assertEq(CONTROL_PANEL_COPY.activity.title, 'TRANSACTION', 'activity title');
assertEq(CONTROL_PANEL_COPY.activity.sysTag, 'TRANSACTIONS // THIS CYCLE', 'activity sys tag');
assertEq(CONTROL_PANEL_COPY.activity.totalLabel, 'TOTAL SPENT', 'total drain');
assertEq(CONTROL_PANEL_COPY.activity.feedLabel, 'TRANSACTION FEED', 'event feed');
assertEq(CONTROL_PANEL_COPY.activity.empty, 'No expenses yet.', 'activity empty');
assertEq(CONTROL_PANEL_COPY.onboarding.cta, 'INITIALIZE', 'onboarding CTA');
assertEq(CONTROL_PANEL_COPY.onboarding.enter, 'ENTER CONTROL PANEL', 'enter CTA');
assertEq(CONTROL_PANEL_COPY.onboarding.ready, 'SYSTEM READY', 'system ready');
assertEq(CONTROL_PANEL_COPY.addExpenseTitle, 'LOG EXPENSE', 'add expense title');
assertEq(CONTROL_PANEL_COPY.allocateTitle, 'MODULES', 'allocate title');
assert(
  CONTROL_PANEL_COPY.onboarding.title.includes('control panel'),
  'onboarding frames as control panel',
);
assert(CONTROL_PANEL_COPY.home.sysTag.includes('RESOURCE CONTROL'), 'home sys tag');
assert(CONTROL_PANEL_COPY.home.pacingHint.includes('checkpoint'), 'pacing hint checkpoint');

console.log(`\nControl panel tests: ${passed} assertions passed`);
console.log('E2E control panel: PASS');
