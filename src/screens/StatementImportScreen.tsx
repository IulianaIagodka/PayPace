import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { FormScroll } from '../components/FormScroll';
import { categoryTitle, nextCategoryInCycle } from '../services/categories';
import { formatMoney, formatShortDate, toDateKey } from '../services/formatting';
import {
  analyzeStatementFile,
  type StatementImportResult,
  type StatementLineItem,
} from '../services/statementAnalyzer';
import {
  filterItemsToWindow,
  groupByDate,
  summarizeByCategory,
} from '../services/statementGrouping';
import { categoryToEnvelopeKey } from '../services/envelopes';
import { findCycleForDate, horizonWindow } from '../services/cycleMatching';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StatementImport'>;

export function StatementImportScreen({ navigation, route }: Props) {
  const { store, activeCycle, importExpensesByDate } = useBudget();
  const currency = store.settings.currencyCode;
  const custom = store.settings.customCategories ?? [];
  const weekStartsOn = store.settings.weekStartsOn ?? 1;
  const horizon =
    route.params?.horizon === 'month'
      ? 'month'
      : route.params?.horizon === 'week'
        ? 'week'
        : store.settings.paceHorizon === 'month'
          ? 'month'
          : 'week';
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [result, setResult] = useState<StatementImportResult | null>(null);
  const [filterToHorizon, setFilterToHorizon] = useState(true);

  const paydayKey = activeCycle?.nextPayday ?? null;
  const window = horizonWindow(horizon, weekStartsOn, new Date(), paydayKey);

  const visibleItems = useMemo(() => {
    return filterItemsToWindow(result?.items ?? [], {
      filterToWindow: filterToHorizon,
      startKey: window.startKey,
      endKey: window.endKey,
    });
  }, [result, filterToHorizon, window.startKey, window.endKey]);

  const outsideCount = useMemo(() => {
    const items = result?.items ?? [];
    if (!items.length) return 0;
    return (
      items.length -
      filterItemsToWindow(items, {
        filterToWindow: true,
        startKey: window.startKey,
        endKey: window.endKey,
      }).length
    );
  }, [result, window.startKey, window.endKey]);

  const categorySummary = useMemo(
    () => summarizeByCategory(visibleItems),
    [visibleItems],
  );

  const dayGroups = useMemo(() => groupByDate(visibleItems), [visibleItems]);

  const cyclePreview = useMemo(() => {
    const map = new Map<string, { label: string; count: number; total: number }>();
    for (const item of visibleItems) {
      const date = item.date ?? toDateKey(new Date());
      const cycle = findCycleForDate(store.cycles, date, activeCycle);
      const key = cycle?.id ?? 'none';
      const label = cycle
        ? `${formatShortDate(cycle.startDate)} → ${formatShortDate(cycle.nextPayday)}`
        : 'No matching cycle';
      const prev = map.get(key) ?? { label, count: 0, total: 0 };
      prev.count += 1;
      prev.total += item.amount;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [visibleItems, store.cycles, activeCycle]);

  const total = useMemo(
    () => visibleItems.reduce((s, i) => s + i.amount, 0),
    [visibleItems],
  );

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>UPLOAD STATEMENT</Text>
          <Text style={styles.sub}>
            Plus imports a bank statement, sorts by day and category, and puts each row in the right
            pay cycle.
          </Text>
          <PlusUnlockButton />
          <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </ScreenBackground>
    );
  }

  const cycleItemCategory = (itemId: string) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const next = nextCategoryInCycle(item.category, custom);
          return { ...item, category: next };
        }),
      };
    });
  };

  const pickFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'text/*',
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'application/pdf',
          'image/*',
          '*/*',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setBusy(true);
      setFileLabel(asset.name);
      setResult(null);
      // Always keep the selected period filter on — bank exports often span more days.
      setFilterToHorizon(true);
      try {
        const scanned = await analyzeStatementFile(asset.uri, asset.name, asset.mimeType);
        setResult(scanned);
      } catch (error) {
        Alert.alert('Import failed', error instanceof Error ? error.message : 'Try another file.');
      } finally {
        setBusy(false);
      }
    } catch (error) {
      Alert.alert('Picker error', error instanceof Error ? error.message : 'Could not open files.');
    }
  };

  const saveAll = async () => {
    if (!visibleItems.length) return;
    setSaving(true);
    try {
      const { cycleCount, itemCount } = await importExpensesByDate(
        visibleItems.map((item: StatementLineItem) => ({
          name: item.name,
          amount: item.amount,
          date: item.date,
          category: item.category,
          envelopeKey: categoryToEnvelopeKey(item.category),
        })),
      );
      Alert.alert(
        'Saved',
        `${itemCount} expenses added across ${cycleCount} pay cycle${cycleCount === 1 ? '' : 's'} (by date + category).`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <FormScroll contentContainerStyle={styles.pad}>
        <Text style={styles.title}>UPLOAD STATEMENT</Text>
        <Text style={styles.sub}>
          Import only rows in the date window below (toggle off to include the whole file). Each
          row keeps its bank date and category — tap a row to change category.
        </Text>

        <Panel>
          <Text style={styles.label}>DATE WINDOW</Text>
          <Text style={styles.fileName}>
            {formatShortDate(window.startKey)} → {formatShortDate(window.endKey)} ·{' '}
            {horizon === 'week' ? 'WEEK' : 'UNTIL PAYDAY'}
          </Text>
          <Pressable
            onPress={() => setFilterToHorizon((v) => !v)}
            style={styles.filterRow}
          >
            <Text style={styles.meta}>
              {filterToHorizon ? '●' : '○'} Only rows in this{' '}
              {horizon === 'week' ? 'week' : 'payday window'}
            </Text>
          </Pressable>
          {result && outsideCount > 0 ? (
            <Text style={styles.meta}>
              {filterToHorizon
                ? `${outsideCount} row${outsideCount === 1 ? '' : 's'} outside this window (hidden)`
                : `${outsideCount} row${outsideCount === 1 ? '' : 's'} outside this window (included)`}
            </Text>
          ) : null}
        </Panel>

        <HudButton title="CHOOSE FILE" onPress={pickFile} disabled={busy} />

        {fileLabel ? (
          <Panel>
            <Text style={styles.label}>FILE</Text>
            <Text style={styles.fileName}>{fileLabel}</Text>
            {result ? (
              <Text style={styles.meta}>
                {result.source === 'parsed' ? 'PARSED' : 'DEMO PARSE'} · {visibleItems.length}/
                {result.items.length} shown · {formatMoney(total, currency)} · {dayGroups.length}{' '}
                day{dayGroups.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </Panel>
        ) : null}

        {busy ? (
          <Panel>
            <ActivityIndicator color={colors.resource} />
            <Text style={styles.sub}>Reading statement…</Text>
          </Panel>
        ) : null}

        {categorySummary.length ? (
          <Panel>
            <Text style={styles.label}>BY CATEGORY</Text>
            {categorySummary.map((row) => (
              <View key={row.category} style={styles.cycleRow}>
                <Text style={styles.rowTitle}>
                  {categoryTitle(row.category, { custom })} · {row.count}
                </Text>
                <Text style={styles.meta}>{formatMoney(row.total, currency)}</Text>
              </View>
            ))}
          </Panel>
        ) : null}

        {cyclePreview.length ? (
          <Panel>
            <Text style={styles.label}>ADDS TO THESE CYCLES</Text>
            {cyclePreview.map((row) => (
              <View key={row.label} style={styles.cycleRow}>
                <Text style={styles.rowTitle}>{row.label}</Text>
                <Text style={styles.meta}>
                  {row.count} · {formatMoney(row.total, currency)}
                </Text>
              </View>
            ))}
          </Panel>
        ) : null}

        {dayGroups.map((group) => (
          <View key={group.date} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={styles.label}>{formatShortDate(group.date).toUpperCase()}</Text>
              <Text style={styles.dayTotal}>
                {group.items.length} · {formatMoney(group.total, currency)}
              </Text>
            </View>
            {group.items.map((item) => {
              const cycle = findCycleForDate(store.cycles, group.date, activeCycle);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => cycleItemCategory(item.id)}
                  style={styles.row}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.meta}>
                      {categoryTitle(item.category, { custom })}
                      {cycle
                        ? ` · cycle ${formatShortDate(cycle.startDate)}`
                        : ' · no cycle match'}
                      {' · tap to change'}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatMoney(item.amount, currency)}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        {visibleItems.length ? (
          <HudButton
            title={saving ? 'IMPORTING…' : `IMPORT ${visibleItems.length} EXPENSES`}
            onPress={saveAll}
            disabled={saving}
          />
        ) : null}

        <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  label: { ...hudType.label },
  fileName: { ...hudType.bodyStrong },
  meta: { ...hudType.body, color: colors.textDim, fontSize: 12, lineHeight: 16 },
  filterRow: { paddingTop: 8 },
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  dayBlock: { gap: 0 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderBright,
  },
  dayTotal: { ...hudType.meta, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { ...hudType.bodyStrong },
  rowAmount: { ...hudType.valueMid },
});
