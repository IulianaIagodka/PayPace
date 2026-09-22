import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { ExpenseRow, Panel, PanelLabel, ScreenBackground } from '../components/ui';
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

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.head}>
          <Text style={styles.title}>DRAIN LOG</Text>
          <Text style={styles.sysTag}>EXPENSE EVENTS // THIS CYCLE</Text>
        </View>

        <Panel>
          <PanelLabel tone="warn">TOTAL DRAIN</PanelLabel>
          <Text style={styles.total}>{formatMoney(snapshot.spentThisCycle, currency)}</Text>
          <Text style={styles.sub}>
            {expenses.length} event{expenses.length === 1 ? '' : 's'} logged against reserves
          </Text>
        </Panel>

        <Panel>
          <PanelLabel>EVENT FEED</PanelLabel>
          {expenses.length === 0 ? (
            <Text style={styles.sub}>No drain events yet.</Text>
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
  head: { gap: 4 },
  title: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  sysTag: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: fonts.body,
  },
  total: {
    color: colors.ammo,
    fontSize: 32,
    fontFamily: fonts.display,
    fontWeight: '700',
  },
});
