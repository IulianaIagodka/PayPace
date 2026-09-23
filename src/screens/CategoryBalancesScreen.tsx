import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground, SegmentedBar } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors, toneForRatio } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryBalances'>;

export function CategoryBalancesScreen({ navigation }: Props) {
  const { store, activeCycle } = useBudget();
  const currency = store.settings.currencyCode;
  const rows = categoryBalancesForDisplay(activeCycle, store.settings.customCategories ?? []);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>BY CATEGORY</Text>
          <Text style={styles.sub}>Plus shows how much you’ve spent in each category.</Text>
          <PlusUnlockButton />
          <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>BY CATEGORY</Text>
        <Text style={styles.sub}>What you’ve spent in each category this pay cycle.</Text>
        <Panel>
          {rows.map((row) => (
            <View key={row.category} style={styles.row}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.name}>{row.title}</Text>
                <SegmentedBar ratio={row.share} segments={8} height={10} />
              </View>
              <Text style={styles.amount}>{formatMoney(row.spent, currency)}</Text>
            </View>
          ))}
        </Panel>
        <HudButton title="SCAN RECEIPT" onPress={() => navigation.navigate('ReceiptScan')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 1.5 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: colors.text, fontWeight: '600', fontSize: 14 },
  amount: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
