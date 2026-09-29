import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Panel, ScreenBackground, SegmentedBar, useTabBarClearance } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors, colorForTone } from '../theme/colors';
import { hudType, tabScreen } from '../theme/hud';
import { formatMoney } from '../services/formatting';
import {
  formatReportPeriodLabel,
  reportKindLabel,
} from '../services/periodReports';
import type { PeriodReport } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Status'>;

export function StatusScreen({}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(40);
  const reports = store.periodReports ?? [];

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
        <View style={tabScreen.pad}>
          <Text style={hudType.brand}>PACE</Text>
          <Text style={hudType.body}>No active cycle.</Text>
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
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>PACE</Text>

        <Panel>
          <Row label="INCOME" value={formatMoney(income, currency)} />
          <Row label="SPENT" value={formatMoney(snapshot.spentThisCycle, currency)} />
          <Row label="BILLS" value={formatMoney(snapshot.unpaidBillsTotal, currency)} />
          <Row label="RESERVED" value={formatMoney(reserve, currency)} />
          <Row
            label="LEFT TO SPEND NOW"
            value={formatMoney(Math.max(remaining, 0), currency)}
          />
          <Row
            label="SAFE TODAY"
            value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
            strong
          />
          <Row
            label="IF THIS PACE → PAYDAY"
            value={formatMoney(snapshot.projectedEndBalance, currency)}
          />
        </Panel>

        <Panel>
          <Text style={hudType.label}>PACE</Text>
          <Text style={styles.paceHint}>Burn vs plan until payday</Text>
          <Text style={[hudType.value, { color: colorForTone(trajTone as any) }]}>
            {snapshot.trajectory}
          </Text>
          <SegmentedBar ratio={snapshot.resourcesRemainingRatio} />
        </Panel>

        <Panel>
          <Text style={hudType.label}>CYCLE TIMELINE</Text>
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
          <Text style={hudType.body}>
            Day {Math.min(snapshot.daysElapsed + 1, Math.max(snapshot.totalDaysInCycle, 1))} of{' '}
            {snapshot.totalDaysInCycle} · {snapshot.daysUntilPayday} left to payday
          </Text>
        </Panel>

        <Panel>
          <Text style={hudType.label}>REPORTS</Text>
          {reports.length === 0 ? (
            <Text style={hudType.body}>
              Weekly and monthly spend-by-category reports land here when a period ends.
            </Text>
          ) : (
            reports.map((report) => (
              <ReportLink
                key={report.id}
                report={report}
                currency={currency}
                onPress={() => navigation.navigate('PeriodReport', { reportId: report.id })}
              />
            ))
          )}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

function ReportLink({
  report,
  currency,
  onPress,
}: {
  report: PeriodReport;
  currency: string;
  onPress: () => void;
}) {
  const unread = !report.viewedAt;
  const slipCount = report.categories.filter((c) => c.slipping).length;

  return (
    <Pressable onPress={onPress} style={styles.reportLink}>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.reportTitleRow}>
          <Text style={hudType.labelPrimary}>
            {reportKindLabel(report.kind)} · {formatReportPeriodLabel(report)}
          </Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={hudType.body}>
          {formatMoney(report.totalSpent, currency)}
          {slipCount > 0 ? ` · ${slipCount} slipping` : ' · on track'}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
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
      <Text style={hudType.label}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowValue: { ...hudType.valueMid, color: colors.text },
  rowValueStrong: { color: colors.resource },
  paceHint: { ...hudType.body, color: colors.textDim, marginBottom: 4 },
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
  reportLink: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 0,
    backgroundColor: colors.resource,
  },
  chevron: {
    ...hudType.label,
    color: colors.textDim,
    fontSize: 18,
  },
});
