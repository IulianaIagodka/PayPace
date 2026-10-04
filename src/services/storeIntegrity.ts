import type { AppStoreData } from '../models/types';

/** True when this looks like a real user budget (not a blank onboarding shell). */
export function isMeaningfulStore(data: AppStoreData): boolean {
  if (data.settings?.hasCompletedOnboarding === true) return true;
  if (Array.isArray(data.cycles) && data.cycles.length > 0) return true;
  if (data.household != null) return true;
  return false;
}

/** Block writing an empty shell over a known-good primary or backup. */
export function shouldRefuseEmptySave(args: {
  allowEmpty?: boolean;
  nextMeaningful: boolean;
  existingMeaningful: boolean;
  backupMeaningful: boolean;
}): boolean {
  if (args.allowEmpty) return false;
  if (args.nextMeaningful) return false;
  return args.existingMeaningful || args.backupMeaningful;
}

/** Prefer primary, then backup, else start fresh. */
export function pickLoadSource(args: {
  primaryMeaningful: boolean;
  backupMeaningful: boolean;
}): 'primary' | 'backup' | 'fresh' {
  if (args.primaryMeaningful) return 'primary';
  if (args.backupMeaningful) return 'backup';
  return 'fresh';
}
