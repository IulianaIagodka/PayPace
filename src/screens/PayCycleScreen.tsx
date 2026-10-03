import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { newId } from '../services/id';
import {
  AmountField,
  CycleProgress,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui'
import { FormScroll } from '../components/FormScroll';
import { HudSelect } from '../components/HudSelect';
import { nextPaydayAfter, scheduleOptions } from '../models/calculator';
import { MAX_CYCLE_TIMELINE_DAYS, resolveCycleDatesOnSave } from '../services/cycleDates';
import type { PaySchedule } from '../models/types';
import {
  asMoney,
  currencySymbol,
  formatMoney,
  formatShortDate,
  fromDateKey,
  parseAmount,
  toDateKey,
} from '../services/formatting';
import { defaultEnvelopes } from '../services/envelopes';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
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
  const [daysSinceStart, setDaysSinceStart] = useState('0');
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
    const today = startOfDay(new Date());
    const days = Math.max(
      differenceInCalendarDays(fromDateKey(activeCycle.nextPayday), today),
      0,
    );
    setDaysUntil(String(days));
    const since = Math.max(
      differenceInCalendarDays(today, fromDateKey(activeCycle.startDate)),
      0,
    );
    setDaysSinceStart(String(since));
  }, [activeCycle?.id, activeCycle?.nextPayday, activeCycle?.startDate]);

  const previewStartKey = useMemo(() => {
    const today = startOfDay(new Date());
    const since = Math.min(
      Math.max(Number(daysSinceStart) || 0, 0),
      MAX_CYCLE_TIMELINE_DAYS,
    );
    return toDateKey(addDays(today, -since));
  }, [daysSinceStart]);

  const previewPaydayKey = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Math.max(Number(daysUntil) || 0, 0);
    if (!activeCycle) return toDateKey(addDays(today, Math.max(days, 1)));
    const currentLeft = Math.max(
      differenceInCalendarDays(fromDateKey(activeCycle.nextPayday), today),
      0,
    );
    if (days === currentLeft) return activeCycle.nextPayday.slice(0, 10);
    return toDateKey(addDays(today, Math.max(days, 1)));
  }, [daysUntil, activeCycle?.nextPayday]);

  if (!activeCycle) return null;

  const save = async () => {
    const days = Math.max(Number(daysUntil) || 0, 0);
    const since = Math.min(
      Math.max(Number(daysSinceStart) || 0, 0),
      MAX_CYCLE_TIMELINE_DAYS,
    );
    const today = startOfDay(new Date());
    const userStart = toDateKey(addDays(today, -since));
    const dates = resolveCycleDatesOnSave({
      existingStartDate: userStart,
      existingNextPayday: activeCycle.nextPayday,
      daysUntilInput: days,
      // User-chosen start wins; do not pull back to older activity.
    });
    await updateActiveCycle((c) => ({
      ...c,
      currentBalance: parseAmount(balance) ?? 0,
      expectedPaycheck: parseAmount(paycheck) ?? 0,
      savingsGoal: parseAmount(savings) ?? 0,
      emergencyBuffer: parseAmount(emergency) ?? 0,
      spendingBuffer: parseAmount(buffer) ?? 0,
      schedule,
      startDate: dates.startDate,
      nextPayday: dates.nextPayday,
      ...(dates.resetDayLock || dates.startDate !== activeCycle.startDate.slice(0, 10)
        ? { dayPaceLock: undefined }
        : {}),
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
      <FormScroll contentContainerStyle={styles.pad}>
        <Text style={styles.title}>EDIT BUDGET</Text>
        <Text style={styles.sub}>
          Update balance, cycle start, payday, or buffers — safe-to-spend recalculates right away.
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
          <Row
            label="Cycle window"
            value={`${formatShortDate(previewStartKey)} → ${formatShortDate(previewPaydayKey)}`}
          />
        </SoftCard>
        <AmountField label="Current balance" value={balance} onChangeText={setBalance} suffix={suffix} />
        <AmountField
          label="Days since cycle start"
          value={daysSinceStart}
          onChangeText={setDaysSinceStart}
          suffix="days"
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>Starts {formatShortDate(previewStartKey)} — last payday / when this cycle began.</Text>
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
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  hint: { ...hudType.meta, marginTop: -4 },
  ok: { ...hudType.body, color: colors.resource },
  rowLabel: { ...hudType.label },
  rowValue: { ...hudType.bodyStrong },
});
