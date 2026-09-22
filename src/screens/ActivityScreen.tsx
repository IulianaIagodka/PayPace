import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ExpenseRow, Panel, ScreenBackground } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';
import { formatMoney } from '../services/formatting';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Activity'>;

export function ActivityScreen({}: Props) {
  const { activeCycle, store, deleteExpense, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const expenses = activeCycle?.expenses ?? [];

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>ACTIVITY</Text>
        <Text style={chrome.sub}>Spent this pay cycle</Text>
        <Text style={styles.total}>{formatMoney(snapshot.spentThisCycle, currency)}</Text>

        <Panel>
          {expenses.length === 0 ? (
            <Text style={chrome.sub}>No expenses yet.</Text>
          ) : (
            expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                currencyCode={currency}
                showChevron
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
  total: {
    color: colors.resource,
    fontSize: 34,
    fontWeight: '700',
    fontFamily: fonts.display,
    letterSpacing: -0.4,
  },
});
