import React, { useEffect, useMemo, useState } from 'react';
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
import { categoryTitle, normalizeCategory } from '../services/categories';
import type { DailyExpense } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Activity'>,
  NativeStackScreenProps<RootStackParamList>
>;

const copy = CONTROL_PANEL_COPY.activity;

export function ActivityScreen({ navigation, route }: Props) {
  const { activeCycle, store, deleteExpense, deleteExpensesByDate } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(28);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  /** Expanded date/category groups. Today starts open in the day view. */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set([todayKey]));

  const [groupBy, setGroupBy] = useState<'day' | 'category'>('day');
  const categoryFilter = route.params?.category;
  const custom = store.settings.customCategories ?? [];
  useEffect(() => {
    if (categoryFilter !== undefined) {
      setGroupBy('category');
      setExpandedGroups(new Set([normalizeCategory(categoryFilter)]));
    }
  }, [categoryFilter]);

  const visibleExpenses = useMemo(
    () => (activeCycle?.expenses ?? []).filter((expense) =>
      categoryFilter === undefined || normalizeCategory(expense.category) === normalizeCategory(categoryFilter)),
    [activeCycle?.expenses, categoryFilter],
  );
  const grouped = useMemo(() => {
    const list = [...visibleExpenses];
    list.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date);
    });
    const map = new Map<string, DailyExpense[]>();
    for (const expense of list) {
      const key = groupBy === 'day' ? expense.date : normalizeCategory(expense.category);
      const bucket = map.get(key) ?? [];
      bucket.push(expense);
      map.set(key, bucket);
    }
    const groups = Array.from(map.entries());
    if (groupBy === 'category') groups.sort((a, b) =>
      b[1].reduce((sum, e) => sum + e.amount, 0) - a[1].reduce((sum, e) => sum + e.amount, 0) || a[0].localeCompare(b[0]));
    return groups;
  }, [visibleExpenses, groupBy]);

  const groupKeys = useMemo(() => grouped.map(([date]) => date), [grouped]);
  const allExpanded = groupKeys.length > 0 && groupKeys.every((date) => expandedGroups.has(date));
  const allCollapsed = groupKeys.length > 0 && groupKeys.every((date) => !expandedGroups.has(date));

  const toggleGroup = (date: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupKeys));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const count = visibleExpenses.length;
  const visibleTotal = visibleExpenses.reduce((sum, expense) => sum + expense.amount, 0);

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

  const onDeleteDay = (date: string, items: DailyExpense[]) => {
    const label = formatShortDate(date);
    const entryLabel = items.length === 1 ? '1 entry' : `${items.length} entries`;
    Alert.alert(
      'Delete this whole day?',
      `${label} · ${entryLabel}. Safe-to-spend will recalculate.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete day',
          style: 'destructive',
          onPress: () => {
            void deleteExpensesByDate(date);
            setExpandedGroups((prev) => {
              if (!prev.has(date)) return prev;
              const next = new Set(prev);
              next.delete(date);
              return next;
            });
          },
        },
      ],
    );
  };

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>
        <Text style={hudType.meta}>{copy.sysTag}</Text>

        <HUDPanel variant="primary" label={categoryFilter === undefined ? copy.totalLabel : categoryTitle(categoryFilter, { custom })}>
          <HudValue>{formatMoney(visibleTotal, currency)}</HudValue>
          <HudMeta>
            {count === 0
              ? categoryFilter === undefined ? 'Nothing logged this cycle' : 'No expenses in this category this cycle'
              : `${count} entr${count === 1 ? 'y' : 'ies'} · pay cycle`}
          </HudMeta>
        </HUDPanel>

        <View style={styles.groupControls}>
          {(['day', 'category'] as const).map((mode) => (
            <Pressable key={mode} accessibilityRole="button"
              accessibilityState={{ selected: groupBy === mode }}
              onPress={() => {
                setGroupBy(mode);
                setExpandedGroups(new Set(mode === 'day' ? [todayKey] : visibleExpenses.map((e) => normalizeCategory(e.category))));
              }}>
              <Text style={[styles.feedAction, groupBy !== mode && styles.feedActionDisabled]}>
                {mode === 'day' ? 'BY DAY' : 'BY CATEGORY'}
              </Text>
            </Pressable>
          ))}
        </View>
        {categoryFilter !== undefined ? (
          <HudButton title="SHOW ALL EXPENSES" variant="secondary"
            onPress={() => navigation.setParams({ category: undefined })} />
        ) : null}
        <View style={styles.feedHead}>
          <Text style={hudType.label}>EXPENSES</Text>
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
            <HudBody>{categoryFilter === undefined ? copy.empty : 'No expenses in this category this cycle.'}</HudBody>
            <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
          </HUDPanel>
        ) : (
          grouped.map(([date, items]) => {
            const groupLabel = groupBy === 'day' ? formatShortDate(date) : categoryTitle(date, { custom });
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
            const expanded = expandedGroups.has(date);
            // Same plate seed as TOTAL SPENT so grit/stars match exactly
            return (
              <HUDPanel key={date} variant="standard" seed={`primary:${copy.totalLabel}`}>
                <View style={styles.dayHeader}>
                  <Pressable
                    onPress={() => toggleGroup(date)}
                    style={styles.dayHeaderText}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${groupLabel}, ${items.length} entries`}
                  >
                    <Text style={hudType.label}>{groupLabel}</Text>
                    <HudMeta>
                      {items.length} · {formatMoney(dayTotal, currency)}
                    </HudMeta>
                  </Pressable>
                  {groupBy === 'day' && categoryFilter === undefined ? <Pressable
                    onPress={() => onDeleteDay(date, items)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete all expenses on ${formatShortDate(date)}`}
                    style={styles.dayDeleteBtn}
                  >
                    <Text style={styles.dayDeleteText}>{copy.deleteDay}</Text>
                  </Pressable> : null}
                  <Pressable
                    onPress={() => toggleGroup(date)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${groupBy}`}
                  >
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.borderBright}
                    />
                  </Pressable>
                </View>
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
  groupControls: { flexDirection: 'row', gap: 24, paddingVertical: 8 },
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
  dayDeleteBtn: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  dayDeleteText: {
    ...hudType.link,
    color: colors.danger,
  },
});
