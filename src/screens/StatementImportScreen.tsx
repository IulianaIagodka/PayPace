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
import { categoryTitle, SPENDING_CATEGORIES } from '../services/categories';
import { formatMoney, formatShortDate, toDateKey } from '../services/formatting';
import {
  analyzeStatementFile,
  type StatementImportResult,
  type StatementLineItem,
} from '../services/statementAnalyzer';
import { categoryToEnvelopeKey } from '../services/envelopes';
import { dateInHorizon, findCycleForDate, horizonWindow } from '../services/cycleMatching';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StatementImport'>;

export function StatementImportScreen({ navigation, route }: Props) {
  const { store, activeCycle, importExpensesByDate, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const weekStartsOn = store.settings.weekStartsOn ?? 1;
  const horizon = route.params?.horizon ?? store.settings.paceHorizon ?? 'week';
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [result, setResult] = useState<StatementImportResult | null>(null);
  const [filterToHorizon, setFilterToHorizon] = useState(true);

  const paydayKey = activeCycle?.nextPayday ?? null;
  const window = horizonWindow(horizon, weekStartsOn, new Date(), paydayKey);

  const visibleItems = useMemo(() => {
    const items = result?.items ?? [];
    if (!filterToHorizon) return items;
    return items.filter((item) => {
      const date = item.date ?? toDateKey(new Date());
      return dateInHorizon(date, horizon, weekStartsOn, new Date(), paydayKey);
    });
  }, [result, filterToHorizon, horizon, weekStartsOn, paydayKey]);

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
            Plus: import a bank statement, auto-categorize rows, and drop them into the right pay
            cycle.
          </Text>
          <HudButton title="UNLOCK PLUS (DEMO)" onPress={() => setPremium(true)} />
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
          const idx = SPENDING_CATEGORIES.indexOf(item.category);
          const next = SPENDING_CATEGORIES[(idx + 1) % SPENDING_CATEGORIES.length];
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
        `${itemCount} expenses added across ${cycleCount} pay cycle${cycleCount === 1 ? '' : 's'}.`,
        [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>UPLOAD STATEMENT</Text>
        <Text style={styles.sub}>
          Import bank export for this {horizon === 'week' ? 'week' : 'pay cycle until payday'}.
          Dates decide which pay cycle each row lands in.
        </Text>

        <Panel>
          <Text style={styles.label}>HORIZON WINDOW</Text>
          <Text style={styles.fileName}>
            {formatShortDate(window.startKey)} → {formatShortDate(window.endKey)} ·{' '}
            {horizon === 'week' ? 'WEEK' : 'UNTIL PAYDAY'}
          </Text>
          <Pressable
            onPress={() => setFilterToHorizon((v) => !v)}
            style={styles.filterRow}
          >
            <Text style={styles.meta}>
              {filterToHorizon ? '●' : '○'} Only rows inside this{' '}
              {horizon === 'week' ? 'week' : 'payday window'}
            </Text>
          </Pressable>
        </Panel>

        <HudButton title="CHOOSE FILE" onPress={pickFile} disabled={busy} />

        {fileLabel ? (
          <Panel>
            <Text style={styles.label}>FILE</Text>
            <Text style={styles.fileName}>{fileLabel}</Text>
            {result ? (
              <Text style={styles.meta}>
                {result.source === 'parsed' ? 'PARSED' : 'DEMO PARSE'} · {visibleItems.length}/
                {result.items.length} shown · {formatMoney(total, currency)}
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

        {cyclePreview.length ? (
          <Panel>
            <Text style={styles.label}>WILL ADD TO CYCLES</Text>
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

        {visibleItems.map((item) => {
          const date = item.date ?? toDateKey(new Date());
          const cycle = findCycleForDate(store.cycles, date, activeCycle);
          return (
            <Pressable key={item.id} onPress={() => cycleItemCategory(item.id)} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {formatShortDate(date)} · {categoryTitle(item.category, false)}
                  {cycle
                    ? ` · cycle ${formatShortDate(cycle.startDate)}`
                    : ' · no cycle match'}
                </Text>
              </View>
              <Text style={styles.rowAmount}>{formatMoney(item.amount, currency)}</Text>
            </Pressable>
          );
        })}

        {visibleItems.length ? (
          <HudButton
            title={saving ? 'IMPORTING…' : `IMPORT ${visibleItems.length} EXPENSES`}
            onPress={saveAll}
            disabled={saving}
          />
        ) : null}

        <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  title: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: fonts.body },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: fonts.label,
  },
  fileName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textDim, fontSize: 12, fontFamily: fonts.body },
  filterRow: { paddingTop: 8 },
  cycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowAmount: { color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: fonts.display },
});
