import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays } from 'date-fns';
import {
  AmountField,
  BillRow,
  HudTextField,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { currencySymbol, formatMoney, parsePositiveAmount, toDateKey } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formScreen, hudType } from '../theme/hud';

export function BillsScreen() {
  const { activeCycle, addBill, updateBill, deleteBill, store } = useBudget();
  const currency = store.settings.currencyCode;
  const suffix = currencySymbol(currency);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  if (!activeCycle) return null;
  const upcoming = activeCycle.bills.filter((b) => !b.isPaid);
  const paid = activeCycle.bills.filter((b) => b.isPaid);

  return (
    <ScreenBackground>
      <FormScroll contentContainerStyle={formScreen.pad}>
        <Text style={styles.title}>UPCOMING BILLS</Text>
        <Text style={styles.sub}>
          Total reserved: {formatMoney(upcoming.reduce((s, b) => s + b.amount, 0), currency)}
        </Text>

        <SoftCard>
          {upcoming.length === 0 ? (
            <Text style={styles.sub}>No unpaid bills.</Text>
          ) : (
            upcoming.map((bill) => (
              <View key={bill.id} style={{ gap: 8 }}>
                <BillRow bill={bill} currencyCode={currency} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => updateBill({ ...bill, isPaid: true })}
                  >
                    <Text style={styles.link}>Mark paid</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteBill(bill.id)}>
                    <Text style={[styles.link, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </SoftCard>

        {paid.length > 0 && (
          <>
            <Text style={styles.section}>Already paid</Text>
            <SoftCard>
              {paid.map((b) => (
                <BillRow key={b.id} bill={b} currencyCode={currency} />
              ))}
            </SoftCard>
          </>
        )}

        <Text style={styles.section}>Add a bill</Text>
        <HudTextField
          label="NAME"
          value={name}
          onChangeText={setName}
          placeholder="Name"
          returnKeyType="done"
          blurOnSubmit
        />
        <AmountField label="AMOUNT" value={amount} onChangeText={setAmount} suffix={suffix} />
        <PrimaryButton
          title="Save bill"
          onPress={async () => {
            const value = parsePositiveAmount(amount);
            if (!name.trim() || value == null) return;
            await addBill({
              name: name.trim(),
              amount: value,
              dueDate: toDateKey(addDays(new Date(), 5)),
              isRecurring: false,
              isPaid: false,
            });
            setName('');
            setAmount('');
          }}
        />
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  section: { ...hudType.label, color: colors.text, marginTop: 8 },
  link: { ...hudType.link },
});
