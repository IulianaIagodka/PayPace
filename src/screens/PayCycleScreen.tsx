import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { addDays, startOfDay } from 'date-fns';
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
import { MAX_CYCLE_TIMELINE_DAYS, resolveCycleDatesFromPicks } from '../services/cycleDates';
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

function dateLabel(key: string): string {
  return fromDateKey(key).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Past first-day options: today back through max cycle length. */
function buildFirstDayOptions(now: Date, currentStart?: string) {
  const today = startOfDay(now);
  const keys = new Set<string>();
  for (let i = 0; i <= MAX_CYCLE_TIMELINE_DAYS; i++) {
    keys.add(toDateKey(addDays(today, -i)));
  }
  if (currentStart && /^\d{4}-\d{2}-\d{2}$/.test(currentStart.slice(0, 10))) {
    keys.add(currentStart.slice(0, 10));
  }
  return Array.from(keys)
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    .map((value) => ({ value, label: dateLabel(value) }));
}

/** Payday options: today through today + max window (plus current). */
function buildPaydayOptions(now: Date, currentPayday?: string) {
  const today = startOfDay(now);
  const keys = new Set<string>();
  for (let i = 0; i <= MAX_CYCLE_TIMELINE_DAYS; i++) {
    keys.add(toDateKey(addDays(today, i)));
  }
  if (currentPayday && /^\d{4}-\d{2}-\d{2}$/.test(currentPayday.slice(0, 10))) {
    keys.add(currentPayday.slice(0, 10));
  }
  return Array.from(keys)
    .sort()
    .map((value) => ({ value, label: dateLabel(value) }));
}

export function PayCycleScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateActiveCycle, replaceActiveCycle } = useBudget();
  const suffix = currencySymbol(store.settings.currencyCode);
  const [balance, setBalance] = useState('');
  const [paycheck, setPaycheck] = useState('');
  const [savings, setSavings] = useState('');
  const [emergency, setEmergency] = useState('');
  const [buffer, setBuffer] = useState('');
  const [firstDay, setFirstDay] = useState(toDateKey(new Date()));
  const [payday, setPayday] = useState(toDateKey(addDays(new Date(), 15)));
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
    setFirstDay(activeCycle.startDate.slice(0, 10));
    setPayday(activeCycle.nextPayday.slice(0, 10));
  }, [activeCycle?.id, activeCycle?.nextPayday, activeCycle?.startDate]);

  const firstDayOptions = useMemo(
    () => buildFirstDayOptions(new Date(), activeCycle?.startDate),
    [activeCycle?.startDate],
  );
  const paydayOptions = useMemo(
    () => buildPaydayOptions(new Date(), activeCycle?.nextPayday),
    [activeCycle?.nextPayday],
  );

  if (!activeCycle) return null;

  const save = async () => {
    const dates = resolveCycleDatesFromPicks({
      startDate: firstDay,
      nextPayday: payday,
    });
    const startChanged = dates.startDate !== activeCycle.startDate.slice(0, 10);
    const paydayChanged = dates.nextPayday !== activeCycle.nextPayday.slice(0, 10);
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
      ...(startChanged || paydayChanged ? { dayPaceLock: undefined } : {}),
    }));
    setSaved(true);
    navigation.navigate('MainTabs');
  };

  const startNext = async () => {
    const next = nextPaydayAfter(schedule, fromDateKey(activeCycle.nextPayday));
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
      nextPayday: toDateKey(next),
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
          Set the pay-cycle dates, balance, and buffers — safe-to-spend recalculates right away.
        </Text>
        <CycleProgress
          progress={snapshot.cycleProgress}
          daysElapsed={snapshot.daysElapsed}
          totalDays={snapshot.totalDaysInCycle}
        />
        <SoftCard>
          <Text style={styles.cycleLabel}>CYCLE WINDOW</Text>
          <Text style={styles.cycleWindow}>
            {formatShortDate(firstDay)} → {formatShortDate(payday)}
          </Text>
          <Row label="Safe today" value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), store.settings.currencyCode)} />
          <Row label="Left until payday" value={formatMoney(snapshot.remainingUntilPayday, store.settings.currencyCode)} />
          <Row label="Spent this cycle" value={formatMoney(snapshot.spentThisCycle, store.settings.currencyCode)} />
        </SoftCard>

        <HudSelect
          label="FIRST DAY"
          value={firstDay}
          options={firstDayOptions}
          onChange={(value) => {
            setFirstDay(value);
            if (value >= payday) {
              setPayday(toDateKey(addDays(fromDateKey(value), 1)));
            }
          }}
          hint="When this pay cycle started (usually last payday)."
        />
        <HudSelect
          label="PAYDAY"
          value={payday}
          options={paydayOptions}
          onChange={(value) => {
            setPayday(value);
            if (value <= firstDay) {
              setFirstDay(toDateKey(addDays(fromDateKey(value), -1)));
            }
          }}
          hint="Next payday — end of this cycle."
        />

        <AmountField label="Current balance" value={balance} onChangeText={setBalance} suffix={suffix} />
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
  cycleLabel: { ...hudType.label },
  cycleWindow: { ...hudType.bodyStrong, color: colors.ammo, marginBottom: 4 },
  ok: { ...hudType.body, color: colors.resource },
  rowLabel: { ...hudType.label },
  rowValue: { ...hudType.bodyStrong },
});
