import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { startOfDay } from 'date-fns';
import { newId } from '../services/id';
import {
  AmountField,
  CycleProgress,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { nextPaydayAfter } from '../models/calculator';
import { currencySymbol, formatMoney, parseAmount } from '../services/formatting';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';

export function PayCycleScreen() {
  const { activeCycle, snapshot, store, updateActiveCycle, replaceActiveCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [balance, setBalance] = useState('');
  const [paycheck, setPaycheck] = useState('');
  const [savings, setSavings] = useState('');
  const [emergency, setEmergency] = useState('');
  const [buffer, setBuffer] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activeCycle) return;
    setBalance(String(activeCycle.currentBalance || ''));
    setPaycheck(activeCycle.expectedPaycheck ? String(activeCycle.expectedPaycheck) : '');
    setSavings(activeCycle.savingsGoal ? String(activeCycle.savingsGoal) : '');
    setEmergency(activeCycle.emergencyBuffer ? String(activeCycle.emergencyBuffer) : '');
    setBuffer(activeCycle.spendingBuffer ? String(activeCycle.spendingBuffer) : '');
  }, [activeCycle?.id]);

  if (!activeCycle) return null;

  const save = async () => {
    await updateActiveCycle((c) => ({
      ...c,
      currentBalance: parseAmount(balance) ?? 0,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
    }));
    setSaved(true);
  };

  const startNext = async () => {
    const payday = nextPaydayAfter(activeCycle.schedule, new Date(activeCycle.nextPayday));
    await replaceActiveCycle({
      id: newId(),
      schedule: activeCycle.schedule,
      startDate: startOfDay(new Date(activeCycle.nextPayday)).toISOString(),
      nextPayday: payday.toISOString(),
      currentBalance: (parseAmount(balance) ?? 0) + (parseAmount(paycheck) ?? 0),
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
      bills: store.settings.isPremium
        ? activeCycle.bills
            .filter((b) => b.isRecurring)
            .map((b) => ({ ...b, id: newId(), isPaid: false }))
        : [],
      expenses: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>This pay cycle</Text>
        <CycleProgress
          progress={snapshot.cycleProgress}
          daysElapsed={snapshot.daysElapsed}
          totalDays={snapshot.totalDaysInCycle}
        />
        <SoftCard>
          <Row label="Safe today" value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), store.settings.currencyCode)} />
          <Row label="Left until payday" value={formatMoney(snapshot.remainingUntilPayday, store.settings.currencyCode)} />
          <Row label="Spent this cycle" value={formatMoney(snapshot.spentThisCycle, store.settings.currencyCode)} />
        </SoftCard>
        <AmountField label="Current balance" value={balance} onChangeText={setBalance} suffix={suffix} />
        <AmountField label="Expected paycheck" value={paycheck} onChangeText={setPaycheck} suffix={suffix} />
        <AmountField label="Savings" value={savings} onChangeText={setSavings} suffix={suffix} />
        <AmountField label="Emergency buffer" value={emergency} onChangeText={setEmergency} suffix={suffix} />
        <AmountField label="Spending buffer" value={buffer} onChangeText={setBuffer} suffix={suffix} />
        <PrimaryButton title="Save changes" onPress={save} />
        <PrimaryButton title="Start next pay cycle" onPress={startNext} />
        {saved && <Text style={styles.ok}>Updated — safe-to-spend refreshed.</Text>}
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.inkSecondary }}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 14 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  ok: { color: colors.success, fontSize: 14 },
});
