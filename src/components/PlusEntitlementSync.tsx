import { useEffect } from 'react';
import {
  allowDemoPremiumUnlock,
  configurePlusBilling,
  refreshPlusEntitlement,
} from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';

/** Syncs Store / RevenueCat Plus entitlement into local settings after load. */
export function PlusEntitlementSync() {
  const { ready, store, setPremium } = useBudget();

  useEffect(() => {
    if (!ready || allowDemoPremiumUnlock()) return;
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
  }, [ready, setPremium, store.settings.isPremium]);

  return null;
}
