import React, { useState } from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { addDays } from 'date-fns';
import { AmountField, BillRow, HudButton, Panel, ScreenBackground } from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { currencySymbol, formatMoney, parsePositiveAmount, toDateKey } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { chrome } from '../theme/chrome';

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
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <FormScroll contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>BILLS</Text>
        <Text style={chrome.sub}>
          Total reserved: {formatMoney(upcoming.reduce((s, b) => s + b.amount, 0), currency)}
        </Text>

        <Panel>
          {upcoming.length === 0 ? (
            <Text style={chrome.sub}>No unpaid bills.</Text>
          ) : (
            upcoming.map((bill) => (
              <View key={bill.id} style={{ gap: 8 }}>
                <BillRow bill={bill} currencyCode={currency} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={() => updateBill({ ...bill, isPaid: true })}>
                    <Text style={chrome.link}>MARK PAID</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteBill(bill.id)}>
                    <Text style={[chrome.link, { color: colors.danger }]}>DELETE</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Panel>

        {paid.length > 0 && (
          <>
            <Text style={chrome.section}>ALREADY PAID</Text>
            <Panel>
              {paid.map((b) => (
                <BillRow key={b.id} bill={b} currencyCode={currency} />
              ))}
            </Panel>
          </>
        )}

        <Text style={chrome.section}>ADD A BILL</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.textDim}
          style={chrome.field}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={Keyboard.dismiss}
        />
        <AmountField label="Amount" value={amount} onChangeText={setAmount} suffix={suffix} />
        <HudButton
          title="SAVE BILL"
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
