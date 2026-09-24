import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { hud } from '../theme/hud';
import { HudButton } from './ui';

type Props = {
  /** Override primary label (default depends on demo vs store). */
  title?: string;
  variant?: 'primary' | 'secondary';
  preferRestore?: boolean;
  /** When set, buys that plan only (no plan picker). */
  plan?: PlusPlan;
  /**
   * `row` — monthly + yearly side by side (Settings). Yearly is highlighted.
   * Default `row` for the dual-plan picker.
   */
  layout?: 'row' | 'stack';
  /** Tighter chips / buttons for Settings. */
  compact?: boolean;
};

/**
 * Unlock Plus: demo toggle in __DEV__, real subscription / restore in store builds.
 * Dual-plan picker shows Monthly + Yearly in one row with Yearly emphasized.
 */
export function PlusUnlockButton({
  title,
  variant = 'primary',
  preferRestore = false,
  plan,
  layout = 'row',
  compact = false,
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
        compact={compact}
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
        compact={compact}
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
        compact={compact}
        title={busy ? '…' : title ?? defaultTitle}
        variant={variant}
        disabled={busy != null}
        onPress={() => run(plan, plan)}
      />
    );
  }

  const monthlyPrice = prices.monthly;
  const yearlyPrice = prices.yearly;

  if (layout === 'stack') {
    return (
      <View style={styles.stack}>
        <HudButton
          compact={compact}
          title={busy === 'monthly' ? '…' : monthlyPrice ? `MONTHLY · ${monthlyPrice}` : 'MONTHLY'}
          variant="secondary"
          disabled={busy != null}
          onPress={() => run('monthly', 'monthly')}
        />
        <HudButton
          compact={compact}
          title={busy === 'yearly' ? '…' : yearlyPrice ? `YEARLY · ${yearlyPrice}` : 'YEARLY'}
          variant="primary"
          disabled={busy != null}
          onPress={() => run('yearly', 'yearly')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <PlanChip
        label="Monthly"
        price={monthlyPrice}
        emphasized={false}
        busy={busy === 'monthly'}
        disabled={busy != null}
        compact={compact}
        onPress={() => run('monthly', 'monthly')}
      />
      <PlanChip
        label="Yearly"
        price={yearlyPrice}
        badge="Best value"
        emphasized
        busy={busy === 'yearly'}
        disabled={busy != null}
        compact={compact}
        onPress={() => run('yearly', 'yearly')}
      />
    </View>
  );
}

function PlanChip({
  label,
  price,
  badge,
  emphasized,
  busy,
  disabled,
  compact,
  onPress,
}: {
  label: string;
  price?: string;
  badge?: string;
  emphasized: boolean;
  busy: boolean;
  disabled: boolean;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        emphasized ? styles.chipYearly : styles.chipMonthly,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.88 },
      ]}
    >
      {badge ? (
        <Text style={[styles.badge, compact && styles.badgeCompact]}>{badge}</Text>
      ) : (
        <View style={[styles.badgeSpacer, compact && styles.badgeSpacerCompact]} />
      )}
      <Text
        style={[
          styles.chipLabel,
          compact && styles.chipLabelCompact,
          emphasized && styles.chipLabelOn,
        ]}
      >
        {busy ? '…' : label}
      </Text>
      <Text
        style={[
          styles.chipPrice,
          compact && styles.chipPriceCompact,
          emphasized && styles.chipPriceOn,
        ]}
      >
        {price ?? '—'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  rowCompact: { gap: 8 },
  chip: {
    flex: 1,
    borderWidth: hud.stroke,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
    minHeight: 88,
    justifyContent: 'center',
  },
  chipCompact: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 2,
    minHeight: 64,
  },
  chipMonthly: {
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
  },
  chipYearly: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  badge: {
    color: colors.resource,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: fonts.label,
    textTransform: 'uppercase',
  },
  badgeCompact: { fontSize: 8, letterSpacing: 1 },
  badgeSpacer: { height: 11 },
  badgeSpacerCompact: { height: 9 },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontFamily: fonts.label,
    textTransform: 'uppercase',
  },
  chipLabelCompact: { fontSize: 11, letterSpacing: 1.1 },
  chipLabelOn: { color: colors.resource },
  chipPrice: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  chipPriceCompact: { fontSize: 13 },
  chipPriceOn: { color: colors.text },
});
