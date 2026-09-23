import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AmountField, HudButton, Panel, ScreenBackground } from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { currencySymbol, parsePositiveAmount, toDateKey } from '../services/formatting';
import {
  FREE_RECEIPT_SCAN_LIMIT,
  freeReceiptScansRemaining,
} from '../services/receiptScanQuota';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { ensureEnvelopes } from '../services/envelopes';
import type { EnvelopeKey } from '../models/types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

export function AddExpenseScreen({ navigation }: Props) {
  const { addExpense, store, activeCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const envelopes = activeCycle ? ensureEnvelopes(activeCycle) : [];
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [envelopeKey, setEnvelopeKey] = useState<EnvelopeKey>(envelopes[0]?.key ?? 'other');
  const [busy, setBusy] = useState(false);
  const scansLeft = freeReceiptScansRemaining(store.settings);

  const selected = envelopes.find((e) => e.key === envelopeKey) ?? envelopes[0];

  const onAdd = async () => {
    const value = parsePositiveAmount(amount);
    if (value == null || !selected) return;
    setBusy(true);
    try {
      await addExpense({
        name: note.trim() || selected.title,
        amount: value,
        date: toDateKey(new Date()),
        category: selected.category,
        envelopeKey: selected.key,
      });
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  };

  const receiptHint =
    scansLeft == null
      ? 'Plus · camera or gallery'
      : scansLeft > 0
        ? `${scansLeft} free · camera or gallery`
        : 'Free used · Plus for more';

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <FormScroll contentContainerStyle={styles.pad}>
        <Text style={styles.title}>ADD EXPENSE</Text>
        <Text style={styles.sub}>
          Log it yourself anytime. Free includes {FREE_RECEIPT_SCAN_LIMIT} receipt scans; bank
          statements are Plus.
        </Text>

        <View style={styles.importRow}>
          <Pressable
            style={styles.importCard}
            onPress={() => navigation.navigate('ReceiptScan')}
          >
            <Ionicons name="camera-outline" size={22} color={colors.resource} />
            <Text style={styles.importTitle}>PHOTO RECEIPT</Text>
            <Text style={styles.importHint}>{receiptHint}</Text>
          </Pressable>
          <Pressable
            style={styles.importCard}
            onPress={() =>
              navigation.navigate('StatementImport', {
                horizon: store.settings.paceHorizon === 'month' ? 'month' : 'week',
              })
            }
          >
            <Ionicons name="document-text-outline" size={22} color={colors.resource} />
            <Text style={styles.importTitle}>BANK FILE</Text>
            <Text style={styles.importHint}>Plus · statement upload</Text>
          </Pressable>
        </View>

        <Text style={styles.or}>OR LOG MANUALLY</Text>

        <AmountField label="AMOUNT" value={amount} onChangeText={setAmount} suffix={suffix} />

        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.grid}>
          {envelopes.map((env) => {
            const on = env.key === envelopeKey;
            return (
              <Pressable
                key={env.id}
                onPress={() => setEnvelopeKey(env.key)}
                style={[styles.cat, on && styles.catOn]}
              >
                <Text style={[styles.catText, on && styles.catTextOn]}>{env.title}</Text>
              </Pressable>
            );
          })}
        </View>

        <Panel>
          <Text style={styles.label}>NOTE (OPTIONAL)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Coffee, groceries…"
            placeholderTextColor={colors.textDim}
            style={styles.note}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
        </Panel>

        <HudButton
          title={busy ? 'LOGGING…' : 'LOG EXPENSE'}
          onPress={onAdd}
          disabled={parsePositiveAmount(amount) == null || busy}
        />
        <HudButton title="CANCEL" onPress={() => navigation.goBack()} variant="secondary" />
      </FormScroll>
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
  sub: { color: colors.textSecondary, fontSize: 13, fontFamily: fonts.body },
  importRow: { flexDirection: 'row', gap: 10 },
  importCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
    borderRadius: 4,
    padding: 14,
    gap: 6,
    minHeight: 96,
  },
  importTitle: {
    color: colors.resource,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  importHint: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  or: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: fonts.label,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 4,
    minWidth: '30%',
  },
  catOn: { borderColor: colors.resource, backgroundColor: '#14301A' },
  catText: { color: colors.textSecondary, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  catTextOn: { color: colors.resource },
  note: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
});
