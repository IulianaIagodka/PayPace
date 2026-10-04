import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { newId } from '../services/id';
import {
  AmountField,
  CycleProgress,
  HudTextField,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { HudSelect } from '../components/HudSelect';
import { nextPaydayAfter, scheduleOptions } from '../models/calculator';
import { resolveCycleDatesOnSave } from '../services/cycleDates';
import type { PaySchedule } from '../models/types';
import { asMoney, currencySymbol, formatMoney, fromDateKey, parseAmount, toDateKey } from '../services/formatting';
import { defaultEnvelopes } from '../services/envelopes';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formScreen, hudType } from '../theme/hud';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PayCycle'>;

export function PayCycleScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateActiveCycle, replaceActiveCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [startDate, setStartDate] = useState('');
  const [dateError, setDateError] = useState('');
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
    setStartDate(activeCycle.startDate.slice(0, 10));
    setDateError('');
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
    setDaysUntil(String(days));
  }, [activeCycle?.id, activeCycle?.nextPayday, activeCycle?.startDate]);

  if (!activeCycle) return null;

  const save = async () => {
    const days = Math.max(Number(daysUntil) || 0, 0);
    const earliestActivity = [
      activeCycle.createdAt?.slice(0, 10),
      ...activeCycle.expenses.map((e) => e.date?.slice(0, 10)),
    ]
      .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d)))
      .sort()[0];
    const startDateChanged = startDate.trim() !== activeCycle.startDate.slice(0, 10);
    let dates: ReturnType<typeof resolveCycleDatesOnSave>;
    try {
      dates = resolveCycleDatesOnSave({
        existingStartDate: activeCycle.startDate,
        existingNextPayday: activeCycle.nextPayday,
        daysUntilInput: days,
        earliestActivityDate: earliestActivity,
        startDateInput: startDateChanged || activeCycle.startDateIsManual ? startDate : undefined,
      });
    } catch (error) {
      setDateError(error instanceof Error ? error.message : 'Check the start date.');
      return;
    }
    setDateError('');
    await updateActiveCycle((c) => ({
      ...c,
      currentBalance: parseAmount(balance) ?? 0,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
      schedule,
      startDate: dates.startDate,
      startDateIsManual: startDateChanged || activeCycle.startDateIsManual,
      nextPayday: dates.nextPayday,
      ...(dates.resetDayLock ? { dayPaceLock: undefined } : {}),
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
      <FormScroll contentContainerStyle={formScreen.compactPad}>
        <Text style={styles.title}>EDIT BUDGET</Text>
        <Text style={styles.sub}>
          Update your balance, cycle dates, or buffers — safe-to-spend recalculates right away.
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
        <AmountField compact label="CURRENT BALANCE" value={balance} onChangeText={setBalance} suffix={suffix} />
        <HudTextField compact
          label="CYCLE START DATE"
          accessibilityLabel="Cycle start date"
          value={startDate}
          onChangeText={(value) => { setStartDate(value); setDateError(''); }}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={10}
          returnKeyType="done"
        />
        <Text style={styles.dateHint}>YYYY-MM-DD · First day of this pay cycle</Text>
        {dateError ? <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text> : null}
        <AmountField compact
          label="DAYS UNTIL PAYDAY"
          value={daysUntil}
          onChangeText={setDaysUntil}
          suffix="days"
          keyboardType="number-pad"
        />
        <AmountField compact label="EXPECTED PAYCHECK" value={paycheck} onChangeText={setPaycheck} suffix={suffix} />
        <HudSelect compact
          label="PAY SCHEDULE"
          value={schedule}
          options={scheduleOptions.map((item) => ({ value: item.id, label: item.title }))}
          onChange={setSchedule}
        />
        <AmountField compact label="SAVINGS" value={savings} onChangeText={setSavings} suffix={suffix} />
        <AmountField compact label="EMERGENCY BUFFER" value={emergency} onChangeText={setEmergency} suffix={suffix} />
        <AmountField compact label="SPENDING BUFFER" value={buffer} onChangeText={setBuffer} suffix={suffix} />
        <PrimaryButton compact title="Save changes" onPress={save} />
        <PrimaryButton compact title="Start next pay cycle" onPress={startNext} />
        {saved && <Text style={styles.ok}>Updated — safe-to-spend refreshed.</Text>}
      </FormScroll>
    </ScreenBackground>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  dateHint: { ...hudType.meta },
  error: { ...hudType.body, color: colors.danger },
  ok: { ...hudType.body, color: colors.resource },
  rowLabel: { ...hudType.label },
  rowValue: { ...hudType.bodyStrong },
});
