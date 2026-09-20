import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AmountField,
  ExpenseRow,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { currencySymbol, formatMoney, parseAmount } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddExpense'>;

export function AddExpenseScreen({ navigation }: Props) {
  const { addExpense, deleteExpense, snapshot, store, activeCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState<number | null>(null);

  const onAdd = async () => {
    const value = parseAmount(amount);
    if (!name.trim() || value == null) return;
    await addExpense({ name: name.trim(), amount: value });
    const nextSafe = Math.max(
      (snapshot.remainingUntilPayday - value) / Math.max(snapshot.daysUntilPayday, 1),
      0,
    );
    setConfirm(nextSafe);
    setName('');
    setAmount('');
  };

  const expenses = activeCycle?.expenses ?? [];

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add spending</Text>
        <Text style={styles.sub}>Keep it simple. Name and amount are enough.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What did you spend on?"
          placeholderTextColor={colors.inkSecondary}
          style={styles.textField}
        />
        <AmountField label="Amount" value={amount} onChangeText={setAmount} suffix={suffix} />
        {confirm != null && (
          <SoftCard style={{ backgroundColor: colors.accentSoft }}>
            <Text style={styles.sub}>Logged</Text>
            <Text style={styles.confirm}>
              Safe today: {formatMoney(confirm, store.settings.currencyCode)}
            </Text>
          </SoftCard>
        )}
        <PrimaryButton
          title="Add expense"
          onPress={onAdd}
          disabled={!name.trim() || parseAmount(amount) == null}
        />

        {expenses.length > 0 && (
          <>
            <Text style={styles.section}>This cycle</Text>
            <SoftCard>
              {expenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  currencyCode={store.settings.currencyCode}
                  onDelete={() =>
                    Alert.alert('Delete spending?', e.name, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          await deleteExpense(e.id);
                          setConfirm(null);
                        },
                      },
                    ])
                  }
                />
              ))}
            </SoftCard>
          </>
        )}

        <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 16, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15 },
  section: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 8 },
  textField: {
    backgroundColor: colors.whiteSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  confirm: { color: colors.accent, fontSize: 22, fontWeight: '700' },
});
