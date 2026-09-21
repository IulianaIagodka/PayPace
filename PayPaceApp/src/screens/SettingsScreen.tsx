import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenBackground, SoftCard } from '../components/ui';
import { CURRENCIES } from '../services/currencies';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, resetAll, syncStatus } = useBudget();
  const s = store.settings;
  const household = store.household;

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SoftCard>
          <Text style={styles.brand}>
            <Text style={styles.brandPay}>Pay</Text>
            <Text style={styles.brandPace}>pace</Text>
          </Text>
          <Text style={styles.sub}>Know exactly what you can spend until payday.</Text>
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Budget</Text>
          <PrimaryButton title="Edit budget" onPress={() => navigation.navigate('PayCycle')} />
          <PrimaryButton title="Upcoming bills" onPress={() => navigation.navigate('Bills')} />
          <PrimaryButton title="History" onPress={() => navigation.navigate('History')} />
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Share</Text>
          <Text style={styles.sub}>
            {household
              ? `Shared with ${household.members.map((m) => m.displayName).join(' & ')}${
                  syncStatus === 'syncing' ? ' · syncing' : ''
                }`
              : 'Invite your partner to the same payday budget.'}
          </Text>
          <PrimaryButton title="Shared budget" onPress={() => navigation.navigate('SharedBudget')} />
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>System</Text>
          <Text style={styles.rowLabel}>Currency</Text>
          {CURRENCIES.map((currency) => (
            <Pressable
              key={currency.code}
              onPress={() => updateSettings({ currencyCode: currency.code })}
              style={styles.row}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.rowText}>
                  {currency.symbol} · {currency.code}
                </Text>
                <Text style={styles.rowSub}>{currency.name}</Text>
              </View>
              <Text style={{ color: s.currencyCode === currency.code ? colors.accent : colors.inkSecondary }}>
                {s.currencyCode === currency.code ? '●' : '○'}
              </Text>
            </Pressable>
          ))}

          <View style={styles.divider} />
          <Text style={styles.rowLabel}>Premium</Text>
          {s.isPremium ? (
            <>
              <Text style={{ color: colors.success, fontWeight: '600' }}>Premium active</Text>
              <PrimaryButton title="Restore free (demo)" onPress={() => setPremium(false)} />
            </>
          ) : (
            <>
              <Text style={styles.sub}>
                Receipt scan, category insights, history extras, widgets.
              </Text>
              <Text style={styles.price}>$2.99/month or $19.99/year</Text>
              <PrimaryButton title="Upgrade (demo unlock)" onPress={() => setPremium(true)} />
            </>
          )}

          <View style={styles.divider} />
          <PrimaryButton
            title="Category balances"
            onPress={() => navigation.navigate('CategoryBalances')}
          />
          <PrimaryButton
            title="Start over (reset setup)"
            onPress={() =>
              Alert.alert(
                'Start over?',
                'This clears your current budget and opens setup again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start over', style: 'destructive', onPress: () => resetAll() },
                ],
              )
            }
          />
        </SoftCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14, paddingBottom: 40 },
  brand: { fontSize: 22, fontWeight: '700' },
  brandPay: { color: colors.ink },
  brandPace: { color: colors.accentMid },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  rowLabel: { color: colors.ink, fontWeight: '600', fontSize: 15, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 52,
  },
  rowText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.inkSecondary, fontSize: 13, marginTop: 2 },
  price: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: 'rgba(24,42,34,0.08)', marginVertical: 12 },
});
