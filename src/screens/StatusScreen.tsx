import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Panel, PanelLabel, ScreenBackground, SegmentedBar, TelemetryCell } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors, colorForTone } from '../theme/colors';
import { fonts } from '../theme/fonts';
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
        <View style={styles.pad}>
          <Text style={styles.title}>SYSTEMS</Text>
          <Text style={styles.sub}>No active cycle.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const income = activeCycle.expectedPaycheck || activeCycle.currentBalance;
  const remaining = snapshot.remainingUntilPayday;
  const reserve = snapshot.reservedTotal;
  const burnDaily =
    snapshot.daysElapsed > 0 ? snapshot.spentThisCycle / Math.max(snapshot.daysElapsed, 1) : 0;
  const trajTone =
    snapshot.trajectory === 'DEFICIT'
      ? 'critical'
      : snapshot.trajectory === 'LOW RESERVE'
        ? 'warning'
        : 'healthy';

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.head}>
          <Text style={styles.title}>SYSTEMS</Text>
          <Text style={styles.sysTag}>TELEMETRY // CYCLE HEALTH</Text>
        </View>

        <Panel>
          <View style={styles.telemetryRow}>
            <TelemetryCell
              label="RUNWAY"
              value={`${snapshot.daysUntilPayday}D`}
              tone={snapshot.daysUntilPayday < 5 ? 'warn' : 'ok'}
            />
            <View style={styles.divider} />
            <TelemetryCell
              label="BURN"
              value={`${formatMoney(burnDaily, currency)}/D`}
              tone={burnDaily > snapshot.safeToSpendToday && snapshot.safeToSpendToday > 0 ? 'warn' : 'normal'}
            />
            <View style={styles.divider} />
            <TelemetryCell
              label="PACE"
              value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
              tone="ok"
            />
          </View>
        </Panel>

        <Panel>
          <PanelLabel>RESOURCE POOL</PanelLabel>
          <Row label="INCOME INTAKE" value={formatMoney(income, currency)} />
          <Row label="TOTAL DRAIN" value={formatMoney(snapshot.spentThisCycle, currency)} />
          <Row label="RESERVES" value={formatMoney(Math.max(remaining, 0), currency)} />
          <Row label="LOCKED BUFFER" value={formatMoney(reserve, currency)} />
          <Row
            label="PACING / DAY"
            value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
            strong
          />
          <Row
            label="PROJECTED AT CHECKPOINT"
            value={formatMoney(snapshot.projectedEndBalance, currency)}
          />
        </Panel>

        <Panel>
          <PanelLabel tone="warn">TRAJECTORY</PanelLabel>
          <Text style={[styles.traj, { color: colorForTone(trajTone as any) }]}>
            {snapshot.trajectory}
          </Text>
          <SegmentedBar ratio={snapshot.resourcesRemainingRatio} segments={12} height={14} />
          <Text style={styles.sub}>
            {Math.round(snapshot.resourcesRemainingRatio * 100)}% resources remaining
          </Text>
        </Panel>

        <Panel>
          <PanelLabel>CHECKPOINT TIMELINE</PanelLabel>
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
            Day {snapshot.daysElapsed} of {snapshot.totalDaysInCycle} · today marked · payday =
            checkpoint
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
      <Text style={[styles.rowValue, strong && { color: colors.resource, fontSize: 18 }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  head: { gap: 4 },
  title: {
    color: colors.text,
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  sysTag: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  telemetryRow: { flexDirection: 'row', alignItems: 'center' },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  sub: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  traj: {
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
    fontFamily: fonts.label,
  },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.display,
  },
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tick: {
    width: 10,
    height: 18,
    borderRadius: 0,
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
