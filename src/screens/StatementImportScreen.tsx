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
import { formatMoney } from '../services/formatting';
import {
  analyzeStatementFile,
  type StatementImportResult,
  type StatementLineItem,
} from '../services/statementAnalyzer';
import { categoryToEnvelopeKey } from '../services/envelopes';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StatementImport'>;

export function StatementImportScreen({ navigation }: Props) {
  const { store, addExpenses } = useBudget();
  const currency = store.settings.currencyCode;
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [result, setResult] = useState<StatementImportResult | null>(null);

  const total = useMemo(
    () => (result?.items ?? []).reduce((s, i) => s + i.amount, 0),
    [result],
  );

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
    if (!result?.items.length) return;
    setSaving(true);
    try {
      await addExpenses(
        result.items.map((item: StatementLineItem) => ({
          name: item.name,
          amount: item.amount,
          date: item.date,
          category: item.category,
          envelopeKey: categoryToEnvelopeKey(item.category),
        })),
      );
      Alert.alert('Saved', `${result.items.length} transactions added.`, [
        { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>UPLOAD STATEMENT</Text>
        <Text style={styles.sub}>
          CSV / bank export / PDF. PayPace maps rows to categories. Tap a row to change category.
        </Text>

        <HudButton title="CHOOSE FILE" onPress={pickFile} disabled={busy} />

        {fileLabel ? (
          <Panel>
            <Text style={styles.label}>FILE</Text>
            <Text style={styles.fileName}>{fileLabel}</Text>
            {result ? (
              <Text style={styles.meta}>
                {result.source === 'parsed' ? 'PARSED' : 'DEMO PARSE'} · {result.items.length} items ·{' '}
                {formatMoney(total, currency)}
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

        {result?.items.map((item) => (
          <Pressable key={item.id} onPress={() => cycleItemCategory(item.id)} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.meta}>
                {categoryTitle(item.category, false)} · tap to change
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatMoney(item.amount, currency)}</Text>
          </Pressable>
        ))}

        {result?.items.length ? (
          <HudButton
            title={saving ? 'IMPORTING…' : `IMPORT ${result.items.length} EXPENSES`}
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
