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
import {
  filterExpenses,
  partnerMemberId,
  type PersonFilter,
} from '../services/expenseFilters';
import type { DailyExpense } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Activity'>,
  NativeStackScreenProps<RootStackParamList>
>;

const copy = CONTROL_PANEL_COPY.activity;

export function ActivityScreen({ navigation }: Props) {
  const { activeCycle, store, deleteExpense, deleteExpensesByDate, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(28);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const inHousehold = Boolean(store.household);
  const partnerId = partnerMemberId(store.household, store.localMemberId);
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all');

  /** Dates the user has expanded; everything else stays collapsed. Today starts open. */
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set([todayKey]));

  const filteredExpenses = useMemo(
    () =>
      filterExpenses(activeCycle?.expenses ?? [], {
        viewerMemberId: store.localMemberId,
        partnerMemberId: partnerId,
        person: inHousehold ? personFilter : 'all',
      }),
    [activeCycle?.expenses, store.localMemberId, partnerId, personFilter, inHousehold],
  );

  const recentChanges = useMemo(() => {
    if (!inHousehold) return [];
    return [...(store.activityEvents ?? [])]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  }, [inHousehold, store.activityEvents]);

  const grouped = useMemo(() => {
    const list = [...filteredExpenses];
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
  }, [filteredExpenses]);

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

  const count = filteredExpenses.length;
  const totalVisible = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const sharedTotal = snapshot.spentThisCycle;

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
            setExpandedDates((prev) => {
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

  const personChips: Array<{ id: PersonFilter; label: string; disabled?: boolean }> = [
    { id: 'all', label: copy.filterAll },
    { id: 'mine', label: copy.filterMine },
    { id: 'partner', label: copy.filterPartner, disabled: !partnerId },
  ];

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>
        <Text style={hudType.meta}>{copy.sysTag}</Text>

        <HUDPanel variant="primary" label={copy.totalLabel}>
          <HudValue>
            {formatMoney(personFilter === 'all' ? sharedTotal : totalVisible, currency)}
          </HudValue>
          <HudMeta>
            {count === 0
              ? personFilter === 'all'
                ? 'Nothing logged this cycle'
                : copy.emptyFiltered
              : personFilter === 'all'
                ? `${count} entr${count === 1 ? 'y' : 'ies'} · shared pool`
                : `${count} entr${count === 1 ? 'y' : 'ies'} · filter`}
          </HudMeta>
        </HUDPanel>

        {inHousehold ? (
          <View style={styles.filterRow}>
            {personChips.map((chip) => {
              const on = personFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  disabled={chip.disabled}
                  onPress={() => setPersonFilter(chip.id)}
                  style={[
                    styles.filterChip,
                    on && styles.filterChipOn,
                    chip.disabled && styles.filterChipDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: !!chip.disabled }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      on && styles.filterTextOn,
                      chip.disabled && styles.filterTextDisabled,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {recentChanges.length > 0 ? (
          <HUDPanel variant="standard" label={copy.changesLabel}>
            {recentChanges.map((event) => (
              <View key={event.id} style={styles.changeRow}>
                <Text style={styles.changeSummary}>{event.summary}</Text>
                <HudMeta>{formatShortDate(event.at.slice(0, 10))}</HudMeta>
              </View>
            ))}
          </HUDPanel>
        ) : null}

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
            <HudBody>
              {(activeCycle?.expenses.length ?? 0) === 0 ? copy.empty : copy.emptyFiltered}
            </HudBody>
            <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
          </HUDPanel>
        ) : (
          grouped.map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0);
            const expanded = expandedDates.has(date);
            return (
              <HUDPanel key={date} variant="standard" seed={`primary:${copy.totalLabel}`}>
                <View style={styles.dayHeader}>
                  <Pressable
                    onPress={() => toggleDay(date)}
                    style={styles.dayHeaderText}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${formatShortDate(date)}, ${items.length} entries`}
                  >
                    <Text style={hudType.label}>{formatShortDate(date)}</Text>
                    <HudMeta>
                      {items.length} · {formatMoney(dayTotal, currency)}
                    </HudMeta>
                  </Pressable>
                  <Pressable
                    onPress={() => onDeleteDay(date, items)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete all expenses on ${formatShortDate(date)}`}
                    style={styles.dayDeleteBtn}
                  >
                    <Text style={styles.dayDeleteText}>{copy.deleteDay}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleDay(date)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? 'Collapse day' : 'Expand day'}
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterChipOn: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  filterChipDisabled: {
    opacity: 0.4,
  },
  filterText: {
    ...hudType.label,
  },
  filterTextOn: {
    color: colors.resource,
  },
  filterTextDisabled: {
    color: colors.textSecondary,
  },
  changeRow: {
    gap: 2,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  changeSummary: {
    ...hudType.body,
  },
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
