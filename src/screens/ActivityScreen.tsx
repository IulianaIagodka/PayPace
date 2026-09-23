import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ExpenseRow, Panel, ScreenBackground } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formatMoney } from '../services/formatting';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Activity'>;

export function ActivityScreen({}: Props) {
  const { activeCycle, store, deleteExpense, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const expenses = activeCycle?.expenses ?? [];

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>SPEND</Text>
        <Text style={styles.sub}>Spent this pay cycle</Text>
        <Text style={styles.total}>{formatMoney(snapshot.spentThisCycle, currency)}</Text>

        <Panel>
          {expenses.length === 0 ? (
            <Text style={styles.sub}>No expenses yet.</Text>
          ) : (
            expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                currencyCode={currency}
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
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  sub: { color: colors.textSecondary, fontSize: 12, letterSpacing: 1.2, fontWeight: '600' },
  total: { color: colors.text, fontSize: 32, fontWeight: '800' },
});
