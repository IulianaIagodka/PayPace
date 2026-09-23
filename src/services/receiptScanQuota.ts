import type { AppSettings } from '../models/types';

/** Free tier: this many successful receipt photo scans. */
export const FREE_RECEIPT_SCAN_LIMIT = 3;

type QuotaSettings = Pick<AppSettings, 'isPremium' | 'freeReceiptScansUsed'>;

export function freeReceiptScansUsed(settings: Pick<AppSettings, 'freeReceiptScansUsed'>): number {
  const n = settings.freeReceiptScansUsed ?? 0;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function canScanReceipt(settings: QuotaSettings): boolean {
  if (settings.isPremium) return true;
  return freeReceiptScansUsed(settings) < FREE_RECEIPT_SCAN_LIMIT;
}

/** Remaining free scans; `null` means unlimited (Plus). */
export function freeReceiptScansRemaining(settings: QuotaSettings): number | null {
  if (settings.isPremium) return null;
  return Math.max(0, FREE_RECEIPT_SCAN_LIMIT - freeReceiptScansUsed(settings));
}
