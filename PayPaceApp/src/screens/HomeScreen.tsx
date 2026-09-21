import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  EnvelopeModule,
  HudButton,
  Panel,
  ScreenBackground,
  SegmentedBar,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formatMoney } from '../services/formatting';
import { envelopeStatuses } from '../services/envelopes';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);

  useEffect(() => {
    if (prevRatio.current > snapshot.resourcesRemainingRatio) {
      setDrainFrom(prevRatio.current);
      const t = setTimeout(() => setDrainFrom(undefined), 220);
      prevRatio.current = snapshot.resourcesRemainingRatio;
      return () => clearTimeout(t);
    }
    prevRatio.current = snapshot.resourcesRemainingRatio;
  }, [snapshot.resourcesRemainingRatio]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.brand}>PAYPACE</Text>
          <Text style={styles.sub}>No active cycle. Configure resources in Settings.</Text>
          <HudButton title="SETTINGS" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScreenBackground>
    );
  }

  const available = Math.max(snapshot.remainingUntilPayday, 0);
  const pct = Math.round(snapshot.resourcesRemainingRatio * 100);

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          PAY<Text style={{ color: colors.resource }}>PACE</Text>
        </Text>

        <Text style={styles.label}>AVAILABLE</Text>
        <Text style={styles.available}>{formatMoney(available, currency)}</Text>

        <SegmentedBar
          ratio={snapshot.resourcesRemainingRatio}
          segments={10}
          height={24}
          animateFrom={drainFrom}
        />
        <Text style={styles.meta}>
          {pct}% resources remaining · {snapshot.daysUntilPayday} days left
        </Text>

        <Panel style={{ marginTop: 8 }}>
          <Text style={styles.label}>SAFE TO SPEND</Text>
          <Text
            style={[
              styles.safe,
              snapshot.isAtRisk && { color: colors.danger },
            ]}
          >
            {formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
            <Text style={styles.perDay}> / day</Text>
          </Text>
        </Panel>

        {snapshot.projectedShortfallDays != null ? (
          <Panel alt style={styles.alert}>
            <Text style={styles.alertTitle}>SPENDING RATE HIGH</Text>
            <Text style={styles.alertBody}>
              At current pace, available money will be depleted {snapshot.projectedShortfallDays}{' '}
              days before your next income.
            </Text>
          </Panel>
        ) : null}

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />

        <Text style={[styles.label, { marginTop: 8 }]}>RESOURCE CELLS</Text>
        {modules.map((m) => (
          <EnvelopeModule
            key={m.envelope.id}
            title={m.envelope.title}
            spent={m.spent}
            allocated={m.envelope.allocated}
            currencyCode={currency}
            tone={m.tone}
            warning={m.warning}
            depleted={m.depleted}
          />
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 32, gap: 12 },
  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  available: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  meta: { color: colors.textSecondary, fontSize: 13 },
  safe: { color: colors.resource, fontSize: 36, fontWeight: '800' },
  perDay: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  alert: { borderColor: colors.warning },
  alertTitle: { color: colors.warning, fontWeight: '800', letterSpacing: 1.2, fontSize: 12 },
  alertBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
