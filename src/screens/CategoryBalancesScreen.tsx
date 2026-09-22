import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground, SegmentedBar } from '../components/ui';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import { formatMoney } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryBalances'>;

export function CategoryBalancesScreen({ navigation }: Props) {
  const { store, activeCycle, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const rows = categoryBalancesForDisplay(activeCycle, store.settings.customCategories ?? []);

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={chrome.pad}>
          <Text style={chrome.title}>BY CATEGORY</Text>
          <Text style={chrome.sub}>Plus shows how much you’ve spent in each category.</Text>
          <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>BY CATEGORY</Text>
        <Text style={chrome.sub}>What you’ve spent in each category this pay cycle.</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    fontFamily: fonts.label,
  },
  amount: {
    color: colors.ammo,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: fonts.display,
  },
});
