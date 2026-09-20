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
  const { store, updateSettings, setPremium, resetAll } = useBudget();
  const s = store.settings;

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SoftCard>
          <Text style={styles.brand}>PayPace</Text>
          <Text style={styles.sub}>Know exactly what you can spend until payday.</Text>
        </SoftCard>

        <PrimaryButton title="Edit budget" onPress={() => navigation.navigate('PayCycle')} />
        <PrimaryButton title="Upcoming bills" onPress={() => navigation.navigate('Bills')} />

        <SoftCard>
          <Text style={styles.section}>Currency</Text>
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
        </SoftCard>

        <SoftCard>
          <Text style={styles.section}>Premium</Text>
          {s.isPremium ? (
            <>
              <Text style={{ color: colors.success, fontWeight: '600' }}>Premium active</Text>
              <PrimaryButton title="Restore free (demo)" onPress={() => setPremium(false)} />
            </>
          ) : (
            <>
              <Text style={styles.sub}>
                Recurring bills, unlimited pay cycles, history, widgets, advanced notifications.
              </Text>
              <Text style={styles.price}>$2.99/month or $19.99/year</Text>
              <PrimaryButton title="Upgrade (demo unlock)" onPress={() => setPremium(true)} />
            </>
          )}
        </SoftCard>

        <PrimaryButton title="View history" onPress={() => navigation.navigate('History')} />
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
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14, paddingBottom: 40 },
  brand: { fontSize: 22, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  section: { color: colors.ink, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, minHeight: 52 },
  rowText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.inkSecondary, fontSize: 13, marginTop: 2 },
  price: { color: colors.accent, fontWeight: '700', fontSize: 15 },
});
