import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { addDays, startOfDay } from 'date-fns';
import { newId } from '../services/id';
import {
  AmountField,
  CycleProgress,
  HudButton,
  SafeSpendHero,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { HudSelect } from '../components/HudSelect';
import { defaultEnvelopes } from '../services/envelopes';
import { calculateSafeSpend, scheduleOptions } from '../models/calculator';
import type { Bill, ExpenseCategory, PayCycle, PaySchedule } from '../models/types';
import { asMoney, currencySymbol, parseAmount, parsePositiveAmount, toDateKey } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';

const billSuggestions: { name: string; category: ExpenseCategory }[] = [
  { name: 'Rent', category: 'rent' },
  { name: 'Utilities', category: 'utilities' },
  { name: 'Internet', category: 'utilities' },
  { name: 'Netflix', category: 'subscriptions' },
  { name: 'Groceries', category: 'groceries' },
  { name: 'Transport', category: 'transport' },
];

type Step = 'welcome' | 'balance' | 'payday' | 'bills' | 'result';

export function OnboardingScreen() {
  const { completeOnboarding, store } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [step, setStep] = useState<Step>('welcome');
  const [balance, setBalance] = useState('');
  const [paycheck, setPaycheck] = useState('');
  const [daysUntil, setDaysUntil] = useState('15');
  const [schedule, setSchedule] = useState<PaySchedule>('monthly');
  const [savings, setSavings] = useState('');
  const [emergency, setEmergency] = useState('');
  const [buffer, setBuffer] = useState('');
  const [bills, setBills] = useState<Bill[]>([]);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');

  const nextPayday = useMemo(() => {
    const days = Math.max(Number(daysUntil) || 15, 1);
    return startOfDay(addDays(new Date(), days));
  }, [daysUntil]);

  const draftCycle: PayCycle = useMemo(() => {
    const balanceN = parseAmount(balance) ?? 0;
    const billsList = bills;
    const unpaid = billsList.filter((b) => !b.isPaid).reduce((s, b) => s + asMoney(b.amount), 0);
    const reserved =
      (parseAmount(savings) ?? 0) + (parseAmount(emergency) ?? 0) + (parseAmount(buffer) ?? 0);
    const pool = Math.max(balanceN - unpaid - reserved, 0);
    return {
      id: newId(),
      schedule,
      startDate: toDateKey(new Date()),
      nextPayday: toDateKey(nextPayday),
      currentBalance: balanceN,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
      bills: billsList,
      expenses: [],
      envelopes: defaultEnvelopes(pool),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  }, [balance, paycheck, savings, emergency, buffer, bills, schedule, nextPayday]);

  const snap = calculateSafeSpend(draftCycle);

  const addBill = () => {
    const amount = parsePositiveAmount(billAmount);
    if (!billName.trim() || amount == null) return;
    setBills((prev) => [
      ...prev,
      {
        id: newId(),
        name: billName.trim(),
        amount,
        dueDate: toDateKey(addDays(new Date(), 3)),
        isRecurring: false,
        isPaid: false,
      },
    ]);
    setBillName('');
    setBillAmount('');
  };

  if (step === 'welcome') {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <View style={{ flex: 1, justifyContent: 'center', gap: 18, paddingTop: 80 }}>
            <Text style={styles.brand}>
              <Text style={styles.brandPay}>Pay</Text>
              <Text style={styles.brandPace}>pace</Text>
            </Text>
            <Text style={styles.title}>Know what you can spend.{'\n'}Until your next payday.</Text>
            <Text style={styles.sub}>
              No monthly spreadsheet. Just a clear number for today — and peace of mind until payday.
            </Text>
          </View>
          <HudButton title="GET STARTED" onPress={() => setStep('balance')} />
        </View>
      </ScreenBackground>
    );
  }

  if (step === 'result') {
    return (
      <ScreenBackground>
        <View style={[styles.pad, { justifyContent: 'space-between' }]}>
          <View style={{ gap: 22, paddingTop: 60 }}>
            <Text style={styles.sub}>You’re set</Text>
            <SafeSpendHero
              safeToday={snap.safeToSpendToday}
              remaining={snap.remainingUntilPayday}
              daysUntil={snap.daysUntilPayday}
              currencyCode={store.settings.currencyCode}
              isAtRisk={snap.isAtRisk}
            />
            <CycleProgress
              progress={snap.cycleProgress}
              daysElapsed={snap.daysElapsed}
              totalDays={snap.totalDaysInCycle}
            />
          </View>
          <HudButton title="GO TO HOME" onPress={() => completeOnboarding(draftCycle)} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <Dots step={step} />
          {step === 'balance' && (
            <View style={{ gap: 20 }}>
              <Text style={styles.title}>How much money do you have right now?</Text>
              <Text style={styles.sub}>Your available balance — what you can actually use.</Text>
              <AmountField label="Available balance" value={balance} onChangeText={setBalance} suffix={suffix} />
              <HudButton
                title="CONTINUE"
                disabled={parseAmount(balance) == null}
                onPress={() => setStep('payday')}
              />
            </View>
          )}

          {step === 'payday' && (
            <View style={{ gap: 16 }}>
              <Text style={styles.title}>When is your next payday?</Text>
              <Text style={styles.sub}>PayPace budgets from now until that day — not by calendar month.</Text>
              <AmountField
                label="Days until payday"
                value={daysUntil}
                onChangeText={setDaysUntil}
                suffix="days"
                keyboardType="number-pad"
              />
              <AmountField
                label="Expected paycheck (optional)"
                value={paycheck}
                onChangeText={setPaycheck}
                suffix={suffix}
              />
              <HudSelect
                label="PAY SCHEDULE"
                value={schedule}
                options={scheduleOptions.map((item) => ({ value: item.id, label: item.title }))}
                onChange={setSchedule}
              />
              <HudButton title="CONTINUE" onPress={() => setStep('bills')} />
            </View>
          )}

          {step === 'bills' && (
            <View style={{ gap: 16 }}>
              <Text style={styles.title}>What needs to be paid before then?</Text>
              <Text style={styles.sub}>Add rent, bills, and anything that must be covered before payday.</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {billSuggestions.map((s) => (
                  <Pressable
                    key={s.name}
                    onPress={() => setBillName(s.name)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={billName}
                onChangeText={setBillName}
                placeholder="Bill name"
                placeholderTextColor={colors.textDim}
                style={chrome.field}
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={Keyboard.dismiss}
              />
              <AmountField label="Amount" value={billAmount} onChangeText={setBillAmount} suffix={suffix} />
              <HudButton title="ADD BILL" onPress={addBill} variant="secondary" />

              {bills.length > 0 && (
                <SoftCard>
                  {bills.map((b) => (
                    <Text key={b.id} style={styles.rowTitle}>
                      {b.name} — {b.amount} {suffix}
                    </Text>
                  ))}
                </SoftCard>
              )}

              <AmountField label="Amount to save (optional)" value={savings} onChangeText={setSavings} suffix={suffix} />
              <AmountField label="Emergency buffer (optional)" value={emergency} onChangeText={setEmergency} suffix={suffix} />
              <AmountField label="Spending buffer (optional)" value={buffer} onChangeText={setBuffer} suffix={suffix} />

              <HudButton
                title={bills.length ? 'CALCULATE SAFE SPEND' : 'SEE MY SAFE SPEND'}
                onPress={() => setStep('result')}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function Dots({ step }: { step: Step }) {
  const order: Step[] = ['balance', 'payday', 'bills'];
  const idx = order.indexOf(step);
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
      {order.map((s, i) => (
        <View
          key={s}
          style={{
            height: 6,
            width: i === idx ? 28 : 10,
            borderRadius: 1,
            backgroundColor: i <= idx ? colors.resource : colors.borderSoft,
            borderWidth: 1,
            borderColor: i <= idx ? colors.resourceDim : colors.border,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexGrow: 1, padding: 20, paddingBottom: 40, gap: 16 },
  brand: { fontSize: 40, fontWeight: '700', fontFamily: fonts.display, letterSpacing: 2 },
  brandPay: { color: colors.text },
  brandPace: { color: colors.resource },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
    fontFamily: fonts.display,
    letterSpacing: 0.5,
  },
  sub: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, fontFamily: fonts.body },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.body },
  chip: {
    backgroundColor: colors.panelAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: fonts.label,
  },
});
