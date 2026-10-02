import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  HudBody,
  HudMeta,
  HudValue,
  Panel,
  ScreenBackground,
  SegmentedBar,
  useTabBarClearance,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors, colorForTone } from '../theme/colors';
import { hudType, tabScreen } from '../theme/hud';
import { formatMoney } from '../services/formatting';
import {
  formatReportPeriodLabel,
  reportKindLabel,
} from '../services/periodReports';
import type { PeriodReport, TrajectoryLabel } from '../models/types';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Status'>;

function trajectoryTone(trajectory: TrajectoryLabel): 'healthy' | 'warning' | 'critical' {
  if (trajectory === 'DEFICIT') return 'critical';
  if (trajectory === 'LOW RESERVE') return 'warning';
  return 'healthy';
}

function trajectoryHint(trajectory: TrajectoryLabel): string {
  switch (trajectory) {
    case 'DEFICIT':
      return 'At this pace you’ll be short before payday.';
    case 'LOW RESERVE':
      return 'Burn is high — money may run thin before payday.';
    case 'WITH RESERVE':
      return 'Ahead of plan. You’re building a buffer.';
    default:
      return 'Spending matches the plan to payday.';
  }
}

export function StatusScreen({}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const tabClearance = useTabBarClearance(56);
  const reports = store.periodReports ?? [];
  const [detailsOpen, setDetailsOpen] = useState(false);

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
          <Text style={hudType.brand}>
            PAY<Text style={hudType.brandAccent}>PACE</Text>
          </Text>
          <Text style={hudType.body}>No active cycle.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const income = activeCycle.expectedPaycheck || activeCycle.currentBalance;
  const remaining = snapshot.remainingUntilPayday;
  const reserve = snapshot.reservedTotal;
  const trajTone = trajectoryTone(snapshot.trajectory);
  const dayNum = Math.min(snapshot.daysElapsed + 1, Math.max(snapshot.totalDaysInCycle, 1));

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}>
        <Text style={hudType.brand}>
          PAY<Text style={hudType.brandAccent}>PACE</Text>
        </Text>

        {/* 1 · Status first */}
        <Panel glow>
          <Text style={hudType.labelPrimary}>STATUS</Text>
          <HudValue testID="pace.status" style={{ color: colorForTone(trajTone) }}>
            {snapshot.trajectory}
          </HudValue>
          <HudBody>{trajectoryHint(snapshot.trajectory)}</HudBody>
          <SegmentedBar ratio={snapshot.resourcesRemainingRatio} />
          <HudMeta testID="pace.dayLabel">
            Day {dayNum} of {snapshot.totalDaysInCycle} · {snapshot.daysUntilPayday} left to payday
          </HudMeta>
        </Panel>

        {/* 2 · Three key numbers */}
        <Panel>
          <Text style={hudType.label}>KEY NUMBERS</Text>
          <KeyRow
            testID="pace.leftToSpend"
            label="LEFT TO SPEND"
            hint="Until payday"
            value={formatMoney(Math.max(remaining, 0), currency)}
            emphasize
          />
          <KeyRow
            testID="pace.safeToday"
            label="SAFE TODAY"
            hint="Daily limit"
            value={formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
          />
          <KeyRow
            testID="pace.projectedPayday"
            label="AT THIS PACE → PAYDAY"
            hint="Projected leftover"
            value={formatMoney(snapshot.projectedEndBalance, currency)}
            warn={snapshot.projectedEndBalance < 0}
          />
        </Panel>

        {/* 3 · Timeline */}
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
          <HudMeta>
            Day {dayNum} · {snapshot.daysUntilPayday} days to payday
          </HudMeta>
        </Panel>

        {/* 4 · Details on demand */}
        <Panel>
          <Pressable
            onPress={() => setDetailsOpen((v) => !v)}
            style={styles.detailsHead}
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsOpen }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={hudType.label}>BREAKDOWN</Text>
              <HudMeta>{detailsOpen ? 'Hide income, bills, reserves' : 'Income, bills, reserves'}</HudMeta>
            </View>
            <Ionicons
              name={detailsOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.borderBright}
            />
          </Pressable>
          {detailsOpen ? (
            <View style={styles.detailsBody}>
              <Row label="INCOME" value={formatMoney(income, currency)} />
              <Row label="SPENT" value={formatMoney(snapshot.spentThisCycle, currency)} />
              <Row label="BILLS" value={formatMoney(snapshot.unpaidBillsTotal, currency)} />
              <Row label="RESERVED" value={formatMoney(reserve, currency)} />
            </View>
          ) : null}
        </Panel>

        <Panel>
          <Text style={hudType.label}>REPORTS</Text>
          {reports.length === 0 ? (
            <HudBody>
              Weekly and monthly spend-by-category reports land here when a period ends.
            </HudBody>
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

function KeyRow({
  label,
  hint,
  value,
  emphasize,
  warn,
  testID,
}: {
  label: string;
  hint: string;
  value: string;
  emphasize?: boolean;
  warn?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.keyRow} testID={testID}>
      <View style={styles.keyText}>
        <Text style={hudType.label}>{label}</Text>
        <HudMeta style={styles.keyHint}>{hint}</HudMeta>
      </View>
      <Text
        testID={testID ? `${testID}.value` : undefined}
        style={[
          styles.keyValue,
          emphasize && styles.keyValueStrong,
          warn && styles.keyValueWarn,
        ]}
      >
        {value}
      </Text>
    </View>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={hudType.label}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  keyText: { flex: 1, gap: 2 },
  keyHint: {
    textTransform: 'none',
    letterSpacing: 0.4,
    color: colors.textDim,
  },
  keyValue: { ...hudType.valueMid, color: colors.text },
  keyValueStrong: { color: colors.resource },
  keyValueWarn: { color: colors.danger },
  detailsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailsBody: {
    marginTop: 4,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowValue: { ...hudType.valueMid, color: colors.text },
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
