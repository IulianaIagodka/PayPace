/**
 * Detect when shared-budget sync moves headline PayPace metrics,
 * and format a short notification body.
 */

export type PaceMetrics = {
  remainingUntilPayday: number;
  safeToSpendToday: number;
  spentThisCycle: number;
  unpaidBillsTotal: number;
  currentBalance: number;
};

export type MetricChange = {
  key: keyof PaceMetrics;
  label: string;
  before: number;
  after: number;
};

const LABELS: Record<keyof PaceMetrics, string> = {
  remainingUntilPayday: 'Remaining',
  safeToSpendToday: 'Safe today',
  spentThisCycle: 'Spent',
  unpaidBillsTotal: 'Bills due',
  currentBalance: 'Balance',
};

const ORDER: Array<keyof PaceMetrics> = [
  'safeToSpendToday',
  'remainingUntilPayday',
  'spentThisCycle',
  'currentBalance',
  'unpaidBillsTotal',
];

function roundMoney(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function metricsEqual(a: PaceMetrics, b: PaceMetrics, eps = 0.005): boolean {
  return ORDER.every((key) => Math.abs(roundMoney(a[key]) - roundMoney(b[key])) <= eps);
}

export function diffPaceMetrics(before: PaceMetrics, after: PaceMetrics, eps = 0.005): MetricChange[] {
  const out: MetricChange[] = [];
  for (const key of ORDER) {
    const prev = roundMoney(before[key]);
    const next = roundMoney(after[key]);
    if (Math.abs(prev - next) > eps) {
      out.push({ key, label: LABELS[key], before: prev, after: next });
    }
  }
  return out;
}

export function formatMetricDelta(
  change: MetricChange,
  formatMoney: (n: number) => string,
): string {
  return `${change.label} ${formatMoney(change.before)} → ${formatMoney(change.after)}`;
}

/** Title + body for a local notification when metrics moved. */
export function partnerMetricsNotice(
  changes: MetricChange[],
  formatMoney: (n: number) => string,
): { title: string; body: string } | null {
  if (!changes.length) return null;
  const top = changes.slice(0, 3).map((c) => formatMetricDelta(c, formatMoney));
  return {
    title: 'PayPace · numbers updated',
    body: top.join(' · '),
  };
}
