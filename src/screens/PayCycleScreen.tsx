import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { newId } from '../services/id';
import {
  AmountField,
  CycleProgress,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { HudSelect } from '../components/HudSelect';
import { nextPaydayAfter, scheduleOptions } from '../models/calculator';
import type { PaySchedule } from '../models/types';
import { asMoney, currencySymbol, formatMoney, fromDateKey, parseAmount, toDateKey } from '../services/formatting';
import { defaultEnvelopes } from '../services/envelopes';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PayCycle'>;

export function PayCycleScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateActiveCycle, replaceActiveCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [balance, setBalance] = useState('');
  const [paycheck, setPaycheck] = useState('');
  const [savings, setSavings] = useState('');
  const [emergency, setEmergency] = useState('');
  const [buffer, setBuffer] = useState('');
  const [daysUntil, setDaysUntil] = useState('15');
  const [schedule, setSchedule] = useState<PaySchedule>('monthly');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!activeCycle) return;
    setBalance(String(activeCycle.currentBalance || ''));
    setPaycheck(activeCycle.expectedPaycheck ? String(activeCycle.expectedPaycheck) : '');
    setSavings(activeCycle.savingsGoal ? String(activeCycle.savingsGoal) : '');
    setEmergency(activeCycle.emergencyBuffer ? String(activeCycle.emergencyBuffer) : '');
    setBuffer(activeCycle.spendingBuffer ? String(activeCycle.spendingBuffer) : '');
    setSchedule(activeCycle.schedule);
    const days = Math.max(
      differenceInCalendarDays(fromDateKey(activeCycle.nextPayday), startOfDay(new Date())),
      0,
    );
    setDaysUntil(String(days || 1));
  }, [activeCycle?.id]);

  if (!activeCycle) return null;

  const save = async () => {
    const days = Math.max(Number(daysUntil) || 1, 0);
    const nextPayday = startOfDay(addDays(new Date(), days));
    await updateActiveCycle((c) => ({
      ...c,
      currentBalance: parseAmount(balance) ?? 0,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
      schedule,
      nextPayday: toDateKey(nextPayday),
    }));
    setSaved(true);
    navigation.navigate('MainTabs');
  };

  const startNext = async () => {
    const payday = nextPaydayAfter(schedule, fromDateKey(activeCycle.nextPayday));
    const balanceN = (parseAmount(balance) ?? 0) + (parseAmount(paycheck) ?? 0);
    const savingsN = parseAmount(savings) ?? 0;
    const emergencyN = parseAmount(emergency) ?? 0;
    const bufferN = parseAmount(buffer) ?? 0;
    const bills = store.settings.isPremium
      ? activeCycle.bills
          .filter((b) => b.isRecurring)
          .map((b) => ({ ...b, id: newId(), isPaid: false }))
      : [];
    const unpaid = bills.reduce((s, b) => s + asMoney(b.amount), 0);
    const pool = Math.max(balanceN - unpaid - savingsN - emergencyN - bufferN, 0);
    await replaceActiveCycle({
      id: newId(),
      schedule,
      startDate: toDateKey(fromDateKey(activeCycle.nextPayday)),
      nextPayday: toDateKey(payday),
      currentBalance: balanceN,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: savingsN,
      emergencyBuffer: emergencyN,
      spendingBuffer: bufferN,
      bills,
      expenses: [],
      envelopes: defaultEnvelopes(pool),
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
    navigation.navigate('MainTabs');
  };

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Edit budget</Text>
        <Text style={styles.sub}>
          Update your balance, payday, or buffers — safe-to-spend recalculates right away.
        </Text>
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
        <AmountField
          label="Days until payday"
          value={daysUntil}
          onChangeText={setDaysUntil}
          suffix="days"
          keyboardType="number-pad"
        />
        <AmountField label="Expected paycheck" value={paycheck} onChangeText={setPaycheck} suffix={suffix} />
        <HudSelect
          label="PAY SCHEDULE"
          value={schedule}
          options={scheduleOptions.map((item) => ({ value: item.id, label: item.title }))}
          onChange={setSchedule}
        />
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
  pad: { padding: 24, gap: 14, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 14, lineHeight: 20 },
  ok: { color: colors.success, fontSize: 14 },
});
