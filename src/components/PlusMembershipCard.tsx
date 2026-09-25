import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  allowDemoPremiumUnlock,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  TERMS_OF_USE_URL,
  unlockPlus,
} from '../services/plusBilling';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hudType } from '../theme/hud';
import { HUDPanel } from './HUDPanel';
import { PlusUnlockButton } from './PlusUnlockButton';
import { HudButton } from './ui';

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

const PLUS_PERKS = [
  'Category budgets & allocate',
  'Unlimited receipt scans',
  'Statement import & history',
  'Shared budget with a partner',
] as const;

/**
 * Membership treatment for Settings — sits above ordinary preference groups,
 * like upgrade / “Pro” cards in other apps (not another BUDGET/SYSTEM panel).
 */
export function PlusMembershipCard({
  isPremium,
  onDemoDowngrade,
}: {
  isPremium: boolean;
  onDemoDowngrade?: () => void;
}) {
  const { setPremium } = useBudget();
  const [restoring, setRestoring] = useState(false);

  const onRestore = async () => {
    setRestoring(true);
    try {
      await unlockPlus({ setPremium, preferRestore: true });
    } finally {
      setRestoring(false);
    }
  };

  if (isPremium) {
    return (
      <HUDPanel variant="primary" label="PAYPACE PLUS" contentStyle={styles.activeInner}>
        <Text style={styles.activeTitle}>You’re on Plus</Text>
        <Text style={hudType.body}>
          Category budgets, unlimited scans, import, history, and shared budget are unlocked.
        </Text>
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => {
            if (Platform.OS === 'ios') {
              void Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
            } else {
              void Linking.openURL(SUPPORT_URL);
            }
          }}
        >
          <Text style={styles.textLink}>
            {Platform.OS === 'ios' ? 'Manage subscription in Apple ID' : 'Manage subscription'}
          </Text>
        </Pressable>
        {allowDemoPremiumUnlock() && onDemoDowngrade ? (
          <HudButton
            compact
            title="BACK TO FREE (DEMO)"
            onPress={onDemoDowngrade}
            variant="secondary"
          />
        ) : null}
      </HUDPanel>
    );
  }

  return (
    <HUDPanel variant="primary" label="PAYPACE PLUS" contentStyle={styles.offerInner}>
      <Text style={styles.offerTitle}>Upgrade your payday budget</Text>
      <View style={styles.perkList}>
        {PLUS_PERKS.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <Text style={styles.perkMark}>+</Text>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>
      <PlusUnlockButton layout="row" />
      {!allowDemoPremiumUnlock() ? (
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          disabled={restoring}
          onPress={() => void onRestore()}
        >
          <Text style={[styles.textLink, styles.center, restoring && { opacity: 0.5 }]}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>
      ) : null}
      <Text style={styles.finePrint}>
        Auto-renewing. Cancel anytime in Apple ID.{' '}
        <Text style={styles.inlineLink} onPress={() => Linking.openURL(TERMS_OF_USE_URL)}>
          Terms
        </Text>
        {' · '}
        <Text style={styles.inlineLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          Privacy
        </Text>
        {' · '}
        <Text style={styles.inlineLink} onPress={() => Linking.openURL(SUPPORT_URL)}>
          Support
        </Text>
      </Text>
    </HUDPanel>
  );
}

const styles = StyleSheet.create({
  offerInner: { gap: 12 },
  activeInner: { gap: 8 },
  offerTitle: {
    ...hudType.bodyStrong,
    fontSize: 17,
    lineHeight: 22,
  },
  activeTitle: {
    ...hudType.bodyStrong,
    fontSize: 17,
    lineHeight: 22,
  },
  perkList: { gap: 6 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  perkMark: {
    color: colors.resource,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    width: 12,
  },
  perkText: {
    ...hudType.body,
    color: colors.text,
    flex: 1,
  },
  textLink: {
    color: colors.resource,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  center: { textAlign: 'center' },
  finePrint: {
    ...hudType.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textDim,
    textAlign: 'center',
  },
  inlineLink: {
    color: colors.resource,
    textDecorationLine: 'underline',
  },
});
