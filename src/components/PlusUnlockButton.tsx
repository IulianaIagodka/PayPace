import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  allowDemoPremiumUnlock,
  fetchPlusSubscriptionProducts,
  plusMonthlyProductId,
  plusYearlyProductId,
  unlockPlus,
  type PlusPlan,
} from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { HudButton } from './ui';

type Props = {
  /** Override primary label (default depends on demo vs store). */
  title?: string;
  variant?: 'primary' | 'secondary';
  preferRestore?: boolean;
  /** When set, buys that plan only (no plan picker). */
  plan?: PlusPlan;
};

/**
 * Unlock Plus: demo toggle in __DEV__, real subscription / restore in store builds.
 * Store purchase shows Monthly + Yearly unless a single `plan` is passed.
 */
export function PlusUnlockButton({
  title,
  variant = 'primary',
  preferRestore = false,
  plan,
}: Props) {
  const { setPremium } = useBudget();
  const [busy, setBusy] = useState<PlusPlan | 'restore' | 'demo' | null>(null);
  const [prices, setPrices] = useState<{ monthly?: string; yearly?: string }>({});
  const demo = allowDemoPremiumUnlock();

  useEffect(() => {
    if (demo || preferRestore) return;
    let cancelled = false;
    void (async () => {
      const products = await fetchPlusSubscriptionProducts();
      if (cancelled) return;
      const monthly = products.find((p) => p.id === plusMonthlyProductId());
      const yearly = products.find((p) => p.id === plusYearlyProductId());
      setPrices({
        monthly: monthly?.displayPrice,
        yearly: yearly?.displayPrice,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [demo, preferRestore]);

  const run = async (next: PlusPlan | 'restore' | 'demo', purchasePlan?: PlusPlan) => {
    setBusy(next);
    try {
      await unlockPlus({
        setPremium,
        preferRestore: next === 'restore',
        plan: purchasePlan,
      });
    } finally {
      setBusy(null);
    }
  };

  if (preferRestore) {
    return (
      <HudButton
        title={busy ? '…' : title ?? 'RESTORE PURCHASES'}
        variant={variant}
        disabled={busy != null}
        onPress={() => run('restore')}
      />
    );
  }

  if (demo) {
    return (
      <HudButton
        title={busy ? '…' : title ?? 'TRY PLUS (DEMO)'}
        variant={variant}
        disabled={busy != null}
        onPress={() => run('demo')}
      />
    );
  }

  if (plan) {
    const price = plan === 'yearly' ? prices.yearly : prices.monthly;
    const defaultTitle =
      plan === 'yearly'
        ? price
          ? `YEARLY · ${price}`
          : 'PLUS YEARLY'
        : price
          ? `MONTHLY · ${price}`
          : 'PLUS MONTHLY';
    return (
      <HudButton
        title={busy ? '…' : title ?? defaultTitle}
        variant={variant}
        disabled={busy != null}
        onPress={() => run(plan, plan)}
      />
    );
  }

  const monthlyLabel = prices.monthly ? `MONTHLY · ${prices.monthly}` : 'PLUS MONTHLY';
  const yearlyLabel = prices.yearly ? `YEARLY · ${prices.yearly}` : 'PLUS YEARLY';

  return (
    <View style={styles.stack}>
      <Text style={styles.hint}>Choose a Plus plan — cancel anytime in Apple ID settings.</Text>
      <HudButton
        title={busy === 'monthly' ? '…' : monthlyLabel}
        variant={variant}
        disabled={busy != null}
        onPress={() => run('monthly', 'monthly')}
      />
      <HudButton
        title={busy === 'yearly' ? '…' : yearlyLabel}
        variant="secondary"
        disabled={busy != null}
        onPress={() => run('yearly', 'yearly')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    fontFamily: fonts.body,
    lineHeight: 16,
  },
});
