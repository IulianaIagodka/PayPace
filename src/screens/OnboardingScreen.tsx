import React, { useMemo, useState } from 'react';
import {
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
  PrimaryButton,
  SafeSpendHero,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { defaultEnvelopes } from '../services/envelopes';
import { calculateSafeSpend, scheduleOptions } from '../models/calculator';
import type { Bill, ExpenseCategory, PayCycle, PaySchedule } from '../models/types';
import { asMoney, currencySymbol, parseAmount, parsePositiveAmount, toDateKey } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';

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
          <PrimaryButton title="Get started" onPress={() => setStep('balance')} />
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
          <PrimaryButton title="Go to home" onPress={() => completeOnboarding(draftCycle)} />
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
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Dots step={step} />
          {step === 'balance' && (
            <View style={{ gap: 20 }}>
              <Text style={styles.title}>How much money do you have right now?</Text>
              <Text style={styles.sub}>Your available balance — what you can actually use.</Text>
              <AmountField label="Available balance" value={balance} onChangeText={setBalance} suffix={suffix} />
              <PrimaryButton
                title="Continue"
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
              <Text style={styles.fieldLabel}>Pay schedule</Text>
              {scheduleOptions.map((item) => (
                <Pressable key={item.id} onPress={() => setSchedule(item.id)} style={styles.choice}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.subSmall}>{item.subtitle}</Text>
                  </View>
                  <Text style={{ color: schedule === item.id ? colors.accent : colors.inkSecondary }}>
                    {schedule === item.id ? '●' : '○'}
                  </Text>
                </Pressable>
              ))}
              <PrimaryButton title="Continue" onPress={() => setStep('bills')} />
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
                placeholderTextColor={colors.inkSecondary}
                style={styles.textField}
              />
              <AmountField label="Amount" value={billAmount} onChangeText={setBillAmount} suffix={suffix} />
              <Secondaryish title="Add bill" onPress={addBill} />

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

              <PrimaryButton
                title={bills.length ? 'Calculate safe spend' : 'See my safe spend'}
                onPress={() => setStep('result')}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function Secondaryish({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{title}</Text>
    </Pressable>
  );
}

function Dots({ step }: { step: Step }) {
  const order: Step[] = ['balance', 'payday', 'bills'];
  const idx = order.indexOf(step);
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
      {order.map((s, i) => (
        <View
          key={s}
          style={{
            height: 8,
            width: i === idx ? 28 : 10,
            borderRadius: 99,
            backgroundColor: i <= idx ? colors.accent : 'rgba(24, 42, 34, 0.12)',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { flexGrow: 1, padding: 24, paddingBottom: 40, gap: 16 },
  brand: { fontSize: 44, fontWeight: '700' },
  brandPay: { color: colors.ink },
  brandPace: { color: colors.accentMid },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink, lineHeight: 36 },
  sub: { fontSize: 16, color: colors.inkSecondary, lineHeight: 22 },
  subSmall: { fontSize: 13, color: colors.inkSecondary },
  fieldLabel: { color: colors.inkSecondary, fontSize: 14, fontWeight: '500' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.whiteSoft,
    borderRadius: 14,
    padding: 14,
  },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  chip: {
    backgroundColor: colors.whiteSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  textField: {
    backgroundColor: colors.whiteSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  secondary: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
});
