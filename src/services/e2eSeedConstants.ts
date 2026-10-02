/**
 * Shared numbers for debug seed + Maestro (no local imports — Node-testable).
 * Empty Day-1 cycle: pool / daysUntil = safe today.
 */
export const E2E_SEED = {
  balance: 3000,
  daysUntilPayday: 15,
  /** Expected daily allowance when today is cycle day 1 and nothing spent. */
  expectedSafeToday: 200,
  currencyCode: 'USD',
  displayName: 'E2E',
} as const;
