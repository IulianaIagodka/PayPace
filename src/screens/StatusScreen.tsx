import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Panel, ResourceBattery, ScreenBackground } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors, colorForTone } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { chrome } from '../theme/chrome';
import { formatMoney } from '../services/formatting';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Status'>;

export function StatusScreen({}: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;

  const timeline = useMemo(() => {
    if (!activeCycle) return [];
    const total = snapshot.totalDaysInCycle;
    return Array.from({ length: Math.min(total, 31) }).map((_, i) => {
      const isToday = i === snapshot.daysElapsed;
      const passed = i < snapshot.daysElapsed;
      return { i, isToday, passed };
    });
  }, [activeCycle, snapshot.daysElapsed, snapshot.totalDaysInCycle]);

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={chrome.pad}>
          <Text style={chrome.title}>STATUS</Text>
          <Text style={chrome.sub}>No active cycle.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const income = activeCycle.expectedPaycheck || activeCycle.currentBalance;
  const remaining = snapshot.remainingUntilPayday;
  const reserve = snapshot.reservedTotal;
  const trajTone =
    snapshot.trajectory === 'DEFICIT'
      ? 'critical'
      : snapshot.trajectory === 'LOW RESERVE'
        ? 'warning'
        : 'healthy';

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>STATUS</Text>
        <Text style={chrome.sub}>Cycle telemetry · remaining energy · trajectory</Text>

        <Panel glow>
          <Row label="INCOME" value={formatMoney(income, currency)} />
          <Row label="SPENT" value={formatMoney(snapshot.spentThisCycle, currency)} />
          <Row label="REMAINING" value={formatMoney(Math.max(remaining, 0), currency)} />
          <Row label="RESERVED" value={formatMoney(reserve, currency)} />
          <Row
            label="SAFE TO SPEND / DAY"
            value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
            strong
          />
          <Row
            label="PROJECTED AT PAYDAY"
            value={formatMoney(snapshot.projectedEndBalance, currency)}
          />
        </Panel>

        <Panel>
          <Text style={chrome.section}>TRAJECTORY</Text>
          <Text style={[styles.traj, { color: colorForTone(trajTone as any) }]}>
            {snapshot.trajectory}
          </Text>
          <ResourceBattery ratio={snapshot.resourcesRemainingRatio} segments={12} />
        </Panel>

        <Panel>
          <Text style={chrome.section}>CYCLE TIMELINE</Text>
          <View style={styles.timeline}>
            {timeline.map((d) => (
              <View
                key={d.i}
                style={[
                  styles.tick,
                  d.passed && styles.tickPassed,
                  d.isToday && styles.tickToday,
                ]}
              />
            ))}
          </View>
          <Text style={chrome.sub}>
            Day {snapshot.daysElapsed} of {snapshot.totalDaysInCycle} · today marked
          </Text>
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { color: colors.resource, fontSize: 17 }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  traj: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: fonts.display,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    fontFamily: fonts.label,
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tick: {
    width: 10,
    height: 18,
    borderRadius: 1,
    backgroundColor: colors.borderSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tickPassed: { backgroundColor: colors.healthy, borderColor: colors.resourceDim },
  tickToday: {
    backgroundColor: colors.warning,
    width: 12,
    height: 22,
    borderColor: colors.warning,
  },
});
