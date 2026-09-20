import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { PrimaryButton, ScreenBackground, SoftCard } from '../components/ui';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors, paceGradient } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryBalances'>;

export function CategoryBalancesScreen({ navigation }: Props) {
  const { store, activeCycle, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const rows = categoryBalancesForDisplay(activeCycle);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>Category balances</Text>
          <Text style={styles.sub}>Premium shows spending by category for this pay cycle.</Text>
          <PrimaryButton title="Unlock Premium (demo)" onPress={() => setPremium(true)} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>Category balances</Text>
        <Text style={styles.sub}>Скільки витрачено в кожній категорії до payday.</Text>
        <SoftCard>
          {rows.map((row) => (
            <View key={row.category} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{row.title}</Text>
                <View style={styles.track}>
                  <LinearGradient
                    colors={[...paceGradient]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[styles.fill, { width: `${Math.max(row.share * 100, row.spent > 0 ? 4 : 0)}%` }]}
                  />
                </View>
              </View>
              <Text style={styles.amount}>{formatMoney(row.spent, currency)}</Text>
            </View>
          ))}
        </SoftCard>
        <PrimaryButton title="Scan receipt" onPress={() => navigation.navigate('ReceiptScan')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: colors.ink, fontWeight: '600', fontSize: 15 },
  amount: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  track: {
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(24, 42, 34, 0.08)',
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: { height: '100%', borderRadius: 99 },
});
