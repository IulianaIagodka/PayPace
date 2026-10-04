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
import { hud, hudType, tabScreen } from '../theme/hud';
import { formatMoney, formatShortDate, toDateKey } from '../services/formatting';
import { CONTROL_PANEL_COPY } from '../services/controlPanel';
import { categoryTitle } from '../services/categories';
import { ensureEnvelopes } from '../services/envelopes';
import {
  filterExpensesForSpend,
  groupExpenses,
  type SpendGroupMode,
} from '../services/spendGrouping';
import type { DailyExpense } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Activity'>,
  NativeStackScreenProps<RootStackParamList>
>;

const copy = CONTROL_PANEL_COPY.activity;

const GROUP_OPTIONS: { value: SpendGroupMode; label: string }[] = [
  { value: 'day', label: copy.groupByDay },
  { value: 'category', label: copy.groupByCategory },
];

export function ActivityScreen({ navigation, route }: Props) {
  const { activeCycle, store, deleteExpense, deleteExpensesByDate, snapshot } = useBudget();
  const currency = store.settings.currencyCode;
  const custom = store.settings.customCategories ?? [];
  const tabClearance = useTabBarClearance(28);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const [groupMode, setGroupMode] = useState<SpendGroupMode>('day');
  /** Optional filter from Home category tap. */
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  /** Expanded group keys (date or category key). Today starts open in day mode. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set([todayKey]));

  const envelopes = useMemo(
    () => (activeCycle ? ensureEnvelopes(activeCycle) : []),
    [activeCycle],
  );

  const envelopeTitleByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const env of envelopes) {
      map.set(String(env.key), env.title);
    }
    return map;
  }, [envelopes]);

  // Apply Home → Spend deep-link params (category filter + group mode).
  const paramGroupBy = route.params?.groupBy;
  const paramCategory = route.params?.category;
  const paramEnvelopeKey = route.params?.envelopeKey;
  useEffect(() => {
    if (paramGroupBy == null && paramCategory == null && paramEnvelopeKey == null) return;
    const filterKey =
      paramEnvelopeKey != null
        ? String(paramEnvelopeKey)
        : paramCategory != null
          ? String(paramCategory)
          : null;
    const nextMode = paramGroupBy ?? (filterKey ? 'category' : undefined);
    if (nextMode) setGroupMode(nextMode);
    if (filterKey) {
      setCategoryFilter(filterKey);
      setExpandedKeys(new Set([filterKey]));
    }
    navigation.setParams({
      groupBy: undefined,
      category: undefined,
      envelopeKey: undefined,
    });
  }, [navigation, paramGroupBy, paramCategory, paramEnvelopeKey]);

  const visibleExpenses = useMemo(
    () => filterExpensesForSpend(activeCycle?.expenses ?? [], categoryFilter),
    [activeCycle?.expenses, categoryFilter],
  );

  const grouped = useMemo(
    () => groupExpenses(visibleExpenses, groupMode),
    [visibleExpenses, groupMode],
  );

  const groupKeys = useMemo(() => grouped.map((g) => g.key), [grouped]);
  const allExpanded = groupKeys.length > 0 && groupKeys.every((key) => expandedKeys.has(key));
  const allCollapsed = groupKeys.length > 0 && groupKeys.every((key) => !expandedKeys.has(key));

  const feedLabel =
    groupMode === 'category' ? copy.feedLabelByCategory : copy.feedLabelByDay;

  const toggleGroup = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(groupKeys));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  const onChangeGroupMode = (mode: SpendGroupMode) => {
    if (mode === groupMode) return;
    setGroupMode(mode);
    if (mode === 'day') {
      setExpandedKeys(new Set([todayKey]));
    } else if (categoryFilter) {
      setExpandedKeys(new Set([categoryFilter]));
    } else {
      setExpandedKeys(new Set());
    }
  };

  const clearCategoryFilter = () => {
    setCategoryFilter(null);
  };

  const count = visibleExpenses.length;
  const totalSpent = useMemo(
    () => visibleExpenses.reduce((sum, e) => sum + e.amount, 0),
    [visibleExpenses],
  );
  const headerTotal = categoryFilter ? totalSpent : snapshot.spentThisCycle;

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
            setExpandedKeys((prev) => {
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

  const groupTitle = (key: string) => {
    if (groupMode === 'day') return formatShortDate(key);
    const envTitle = envelopeTitleByKey.get(key);
    if (envTitle) return envTitle;
    return categoryTitle(key, { custom }).toUpperCase();
  };

  const filterLabel = categoryFilter
    ? envelopeTitleByKey.get(categoryFilter) ??
      categoryTitle(categoryFilter, { custom }).toUpperCase()
    : null;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>
        <Text style={hudType.meta}>{copy.sysTag}</Text>

        <HUDPanel variant="primary" label={copy.totalLabel}>
          <HudValue>{formatMoney(headerTotal, currency)}</HudValue>
          <HudMeta>
            {count === 0
              ? categoryFilter
                ? 'Nothing in this category'
                : 'Nothing logged this cycle'
              : categoryFilter
                ? `${count} entr${count === 1 ? 'y' : 'ies'} · ${filterLabel}`
                : `${count} entr${count === 1 ? 'y' : 'ies'} · pay cycle`}
          </HudMeta>
        </HUDPanel>

        <View style={styles.modeRow}>
          {GROUP_OPTIONS.map((opt) => {
            const on = opt.value === groupMode;
            return (
              <Pressable
                key={opt.value}
                onPress={() => onChangeGroupMode(opt.value)}
                style={[styles.modeBtn, on && styles.modeBtnOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Group by ${opt.label}`}
              >
                <Text style={[styles.modeText, on && styles.modeTextOn]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {categoryFilter && filterLabel ? (
          <View style={styles.filterBar}>
            <Text style={styles.filterText} numberOfLines={1}>
              {filterLabel}
            </Text>
            <Pressable
              onPress={clearCategoryFilter}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear category filter"
            >
              <Text style={styles.filterClear}>{copy.clearFilter}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.feedHead}>
          <Text style={hudType.label}>{feedLabel}</Text>
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
              {categoryFilter
                ? 'No expenses in this category yet.'
                : copy.empty}
            </HudBody>
            {categoryFilter ? (
              <HudButton title="SHOW ALL" variant="secondary" onPress={clearCategoryFilter} />
            ) : (
              <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
            )}
          </HUDPanel>
        ) : (
          grouped.map((group) => {
            const expanded = expandedKeys.has(group.key);
            const title = groupTitle(group.key);
            return (
              <HUDPanel key={group.key} variant="standard" seed={`primary:${copy.totalLabel}`}>
                <View style={styles.dayHeader}>
                  <Pressable
                    onPress={() => toggleGroup(group.key)}
                    style={styles.dayHeaderText}
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    accessibilityLabel={`${title}, ${group.items.length} entries`}
                  >
                    <Text style={hudType.label}>{title}</Text>
                    <HudMeta>
                      {group.items.length} · {formatMoney(group.total, currency)}
                    </HudMeta>
                  </Pressable>
                  {groupMode === 'day' ? (
                    <Pressable
                      onPress={() => onDeleteDay(group.key, group.items)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete all expenses on ${title}`}
                      style={styles.dayDeleteBtn}
                    >
                      <Text style={styles.dayDeleteText}>{copy.deleteDay}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={() => toggleGroup(group.key)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? 'Collapse group' : 'Expand group'}
                  >
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.borderBright}
                    />
                  </Pressable>
                </View>
                {expanded
                  ? group.items.map((expense) => (
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
  modeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    paddingHorizontal: 6,
  },
  modeBtnOn: {
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  modeText: {
    ...hudType.label,
    color: colors.textDim,
  },
  modeTextOn: {
    color: colors.ammo,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    ...hudType.label,
    color: colors.ammo,
    flex: 1,
  },
  filterClear: {
    ...hudType.link,
    color: colors.resource,
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
