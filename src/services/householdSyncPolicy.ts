/** Pure helpers for shared-household cloud sync policy. */

/** Skip writing if cloud already has a newer revision. */
export function shouldSkipStaleUpsert(
  localRevision: number,
  remoteRevision: number | null | undefined,
): boolean {
  return typeof remoteRevision === 'number' && remoteRevision > localRevision;
}

/** Background reconcile while the app is open (ms). Live edits use Realtime. */
export const HOUSEHOLD_POLL_MS = 20 * 60 * 1000;
