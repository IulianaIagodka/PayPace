import type { SafeSpendSnapshot, TrajectoryLabel } from '../models/types';

/** Money situation for the Home status chip. */
export type MoneyStatus = 'ok' | 'tense' | 'critical';

export type MoneyStatusInput = Pick<
  SafeSpendSnapshot,
  'remainingUntilPayday' | 'isAtRisk' | 'trajectory' | 'resourcesRemainingRatio'
>;

export function moneyStatusFromSnapshot(snapshot: MoneyStatusInput): MoneyStatus {
  if (snapshot.remainingUntilPayday < 0 || snapshot.trajectory === 'DEFICIT') {
    return 'critical';
  }
  if (
    snapshot.trajectory === 'LOW RESERVE' ||
    snapshot.isAtRisk ||
    snapshot.resourcesRemainingRatio < 0.4
  ) {
    return 'tense';
  }
  return 'ok';
}

export function moneyStatusLabel(status: MoneyStatus): string {
  switch (status) {
    case 'critical':
      return 'CRITICAL';
    case 'tense':
      return 'TENSE';
    default:
      return 'OK';
  }
}

export function moneyStatusFromTrajectory(trajectory: TrajectoryLabel): MoneyStatus {
  if (trajectory === 'DEFICIT') return 'critical';
  if (trajectory === 'LOW RESERVE') return 'tense';
  return 'ok';
}
