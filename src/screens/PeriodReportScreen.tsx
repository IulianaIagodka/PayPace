import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Panel, ScreenBackground, SegmentedBar } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
import { formatMoney } from '../services/formatting';
import {
  formatReportPeriodLabel,
  reportKindLabel,
} from '../services/periodReports';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PeriodReport'>;

export function PeriodReportScreen({ navigation, route }: Props) {
  const { store, markPeriodReportViewed } = useBudget();
  const currency = store.settings.currencyCode;
  const report = (store.periodReports ?? []).find((r) => r.id === route.params.reportId) ?? null;
  const title = report ? `${reportKindLabel(report.kind)} REPORT` : 'REPORT';

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (report) void markPeriodReportViewed(report.id);
  }, [report?.id, markPeriodReportViewed]);

  if (!report) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>REPORT</Text>
          <Text style={hudType.body}>This report is no longer available.</Text>
        </ScrollView>
      </ScreenBackground>
    );
  }

  const slipCount = report.categories.filter((c) => c.slipping).length;

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>{title}</Text>
        <Text style={hudType.body}>{formatReportPeriodLabel(report)}</Text>

        <Panel>
          <Row label="TOTAL SPENT" value={formatMoney(report.totalSpent, currency)} strong />
          <Row
            label="SLIPPING"
            value={slipCount === 0 ? 'None' : String(slipCount)}
            warn={slipCount > 0}
          />
        </Panel>

        <Panel>
          <Text style={hudType.label}>SUMMARY</Text>
          <Text style={hudType.body}>{report.summary}</Text>
        </Panel>

        <Panel>
          <Text style={hudType.label}>BY CATEGORY</Text>
          {report.categories.map((row) => (
            <View key={row.category} style={styles.catRow}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.catTitleRow}>
                  <Text style={styles.catName}>{row.title}</Text>
                  {row.slipping ? <Text style={styles.slipTag}>SLIP</Text> : null}
                </View>
                <SegmentedBar ratio={row.share} segments={8} height={8} />
              </View>
              <Text style={[styles.catAmount, row.slipping && { color: colors.warning }]}>
                {formatMoney(row.spent, currency)}
              </Text>
            </View>
          ))}
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

function Row({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={hudType.label}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          strong && styles.rowValueStrong,
          warn && styles.rowValueWarn,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14 },
  title: { ...hudType.screenTitle },
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
  rowValueWarn: { color: colors.warning },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { ...hudType.bodyStrong },
  slipTag: {
    ...hudType.label,
    color: colors.warning,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  catAmount: { ...hudType.valueMid },
});
