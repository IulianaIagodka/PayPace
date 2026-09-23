import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ExpenseRow, Panel, ScreenBackground, useTabBarClearance } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatMoney } from '../services/formatting';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Activity'>;

export function ActivityScreen({}: Props) {
  const { activeCycle, store, deleteExpense, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const expenses = activeCycle?.expenses ?? [];
  const tabClearance = useTabBarClearance(32);

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: tabClearance }]}>
        <View style={styles.head}>
          <Text style={styles.title}>TRANS</Text>
          <Text style={styles.total}>{formatMoney(snapshot.spentThisCycle, currency)}</Text>
        </View>
        <Text style={styles.sub}>This pay cycle</Text>

        <Panel>
          {expenses.length === 0 ? (
            <Text style={styles.sub}>No expenses yet.</Text>
          ) : (
            expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                currencyCode={currency}
                compact
                onDelete={() =>
                  Alert.alert('Delete this expense?', e.name, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteExpense(e.id),
                    },
                  ])
                }
              />
            ))
          )}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: fonts.display,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
    fontFamily: fonts.label,
  },
  total: {
    color: colors.ammo,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.display,
  },
});
