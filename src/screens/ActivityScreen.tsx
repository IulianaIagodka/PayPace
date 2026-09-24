import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ExpenseRow,
  HudBody,
  HudButton,
  HUDPanel,
  HudMeta,
  HudValue,
  ScreenBackground,
  useTabBarClearance,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hud, hudType } from '../theme/hud';
import { formatMoney, formatShortDate } from '../services/formatting';
import { CONTROL_PANEL_COPY } from '../services/controlPanel';
import type { DailyExpense } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Activity'>,
  NativeStackScreenProps<RootStackParamList>
>;

const copy = CONTROL_PANEL_COPY.activity;

export function ActivityScreen({ navigation }: Props) {
  const { activeCycle, store, deleteExpense, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(28);

  const grouped = useMemo(() => {
    const list = [...(activeCycle?.expenses ?? [])];
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date);
    });
    const map = new Map<string, DailyExpense[]>();
    for (const expense of list) {
      const bucket = map.get(expense.date) ?? [];
      bucket.push(expense);
      map.set(expense.date, bucket);
    }
    return Array.from(map.entries());
  }, [activeCycle?.expenses]);

  const count = activeCycle?.expenses.length ?? 0;

  const onDelete = (expense: DailyExpense) => {
    Alert.alert('Delete this expense?', expense.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExpense(expense.id),
      },
    ]);
  };

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: tabClearance }]}>
        <Text style={styles.brand}>{copy.title}</Text>
        <Text style={hudType.meta}>{copy.sysTag}</Text>

        <HUDPanel variant="standard" label={copy.totalLabel}>
          <HudValue>{formatMoney(snapshot.spentThisCycle, currency)}</HudValue>
          <HudMeta>
            {count === 0
              ? 'Nothing logged this cycle'
              : `${count} entr${count === 1 ? 'y' : 'ies'} · pay cycle`}
          </HudMeta>
        </HUDPanel>

        <View style={styles.feedHead}>
          <Text style={hudType.label}>{copy.feedLabel}</Text>
        </View>

        {grouped.length === 0 ? (
          <HUDPanel variant="standard">
            <HudBody>{copy.empty}</HudBody>
            <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
          </HUDPanel>
        ) : (
          grouped.map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
            return (
              <HUDPanel
                key={date}
                variant="compact"
                label={formatShortDate(date)}
              >
                <View style={styles.dayMeta}>
                  <HudMeta>
                    {items.length} · {formatMoney(dayTotal, currency)}
                  </HudMeta>
                </View>
                {items.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    currencyCode={currency}
                    compact
                    onDelete={() => onDelete(expense)}
                  />
                ))}
              </HUDPanel>
            );
          })
        )}

        {grouped.length > 0 ? (
          <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: hud.screenPad,
    paddingTop: 10,
    gap: hud.stackGap,
  },
  brand: {
    ...hudType.brand,
  },
  feedHead: {
    marginTop: 2,
  },
  dayMeta: {
    marginBottom: 4,
  },
});
