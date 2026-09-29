import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { hudType, tabScreen } from '../theme/hud';
import { formatMoney, formatShortDate, toDateKey } from '../services/formatting';
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
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  /** Dates the user has expanded; everything else stays collapsed. Today starts open. */
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set([todayKey]));

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

  const dates = useMemo(() => grouped.map(([date]) => date), [grouped]);
  const allExpanded = dates.length > 0 && dates.every((date) => expandedDates.has(date));
  const allCollapsed = dates.length > 0 && dates.every((date) => !expandedDates.has(date));

  const toggleDay = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDates(new Set(dates));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

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
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>{copy.title}</Text>
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
          {grouped.length > 0 ? (
            <View style={styles.feedActions}>
              <Pressable
                onPress={expandAll}
                disabled={allExpanded}
                accessibilityRole="button"
                accessibilityLabel={copy.expandAll}
                hitSlop={8}
              >
                <Text style={[styles.feedAction, allExpanded && styles.feedActionDisabled]}>
                  {copy.expandAll}
                </Text>
              </Pressable>
              <Text style={styles.feedActionSep}>·</Text>
              <Pressable
                onPress={collapseAll}
                disabled={allCollapsed}
                accessibilityRole="button"
                accessibilityLabel={copy.collapseAll}
                hitSlop={8}
              >
                <Text style={[styles.feedAction, allCollapsed && styles.feedActionDisabled]}>
                  {copy.collapseAll}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {grouped.length === 0 ? (
          <HUDPanel variant="standard">
            <HudBody>{copy.empty}</HudBody>
            <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
          </HUDPanel>
        ) : (
          grouped.map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
            const expanded = expandedDates.has(date);
            return (
              <HUDPanel key={date} variant="compact">
                <Pressable
                  onPress={() => toggleDay(date)}
                  style={styles.dayHeader}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${formatShortDate(date)}, ${items.length} entries`}
                >
                  <View style={styles.dayHeaderText}>
                    <Text style={hudType.label}>{formatShortDate(date)}</Text>
                    <HudMeta>
                      {items.length} · {formatMoney(dayTotal, currency)}
                    </HudMeta>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.borderBright}
                  />
                </Pressable>
                {expanded
                  ? items.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        currencyCode={currency}
                        compact
                        onDelete={() => onDelete(expense)}
                      />
                    ))
                  : null}
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
  feedHead: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  feedAction: {
    ...hudType.meta,
    color: colors.resource,
    letterSpacing: 1.2,
  },
  feedActionDisabled: {
    color: colors.textSecondary,
    opacity: 0.55,
  },
  feedActionSep: {
    ...hudType.meta,
    color: colors.textSecondary,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dayHeaderText: {
    flex: 1,
    gap: 2,
  },
});
