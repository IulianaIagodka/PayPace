import { useEffect } from 'react';
import {
  allowDemoPremiumUnlock,
  configurePlusBilling,
  refreshPlusEntitlement,
} from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';

/** Syncs App Store / StoreKit Plus ownership into local settings after load. */
export function PlusEntitlementSync() {
  const { ready, store, setPremium } = useBudget();

  useEffect(() => {
    if (!ready || allowDemoPremiumUnlock()) return;
    // Do not touch disk until a real budget exists (guards against wipe after crash recovery).
    if (!store.settings.hasCompletedOnboarding) return;
    let cancelled = false;
    void (async () => {
      await configurePlusBilling();
      const active = await refreshPlusEntitlement();
      if (cancelled || !active) return;
      if (!store.settings.isPremium) await setPremium(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, setPremium, store.settings.hasCompletedOnboarding, store.settings.isPremium]);

  return null;
}
