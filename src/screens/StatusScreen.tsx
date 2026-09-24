import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Panel, ScreenBackground, SegmentedBar, useTabBarClearance } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors, colorForTone } from '../theme/colors';
import { hudType } from '../theme/hud';
import { formatMoney } from '../services/formatting';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Status'>;

export function StatusScreen({}: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(40);

  const timeline = useMemo(() => {
    if (!activeCycle) return [];
    const total = snapshot.totalDaysInCycle;
    return Array.from({ length: Math.min(total, 31) }).map((_, i) => {
      const isToday = i === Math.min(snapshot.daysElapsed, Math.max(total - 1, 0));
      const passed = i < snapshot.daysElapsed;
      return { i, isToday, passed };
    });
  }, [activeCycle, snapshot.daysElapsed, snapshot.totalDaysInCycle]);

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.title}>PACE</Text>
          <Text style={styles.sub}>No active cycle.</Text>
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
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: tabClearance }]}>
        <Text style={styles.title}>PACE</Text>

        <Panel>
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
            label="LEFT AT PAYDAY"
            value={formatMoney(snapshot.projectedEndBalance, currency)}
          />
        </Panel>

        <Panel>
          <Text style={styles.label}>PACE</Text>
          <Text style={[styles.traj, { color: colorForTone(trajTone as any) }]}>
            {snapshot.trajectory}
          </Text>
          <SegmentedBar ratio={snapshot.resourcesRemainingRatio} segments={12} height={14} />
        </Panel>

        <Panel>
          <Text style={styles.label}>CYCLE TIMELINE</Text>
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
          <Text style={styles.sub}>
            Day {Math.min(snapshot.daysElapsed + 1, snapshot.totalDaysInCycle)} of{' '}
            {snapshot.totalDaysInCycle} · today marked
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
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14 },
  title: { ...hudType.screenTitle },
  label: { ...hudType.label },
  sub: { ...hudType.body },
  traj: { ...hudType.value },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...hudType.label },
  rowValue: { ...hudType.valueMid, color: colors.text },
  rowValueStrong: { color: colors.resource, fontSize: 18 },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tick: {
    width: 10,
    height: 18,
    borderRadius: 0,
    backgroundColor: colors.borderSoft,
  },
  tickPassed: { backgroundColor: colors.healthy },
  tickToday: {
    backgroundColor: colors.resource,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
});
