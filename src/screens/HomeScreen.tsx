import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  EmptyCell,
  HudButton,
  Panel,
  ScreenBackground,
  SegmentedBar,
  StatusChip,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatMoney } from '../services/formatting';
import { envelopeStatuses } from '../services/envelopes';
import type { PaceHorizon } from '../models/calculator';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const GRID_KEYS = ['food', 'transport', 'kids', 'fun', 'home'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateSettings } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (prevRatio.current > snapshot.resourcesRemainingRatio) {
      setDrainFrom(prevRatio.current);
      const t = setTimeout(() => setDrainFrom(undefined), 220);
      prevRatio.current = snapshot.resourcesRemainingRatio;
      return () => clearTimeout(t);
    }
    prevRatio.current = snapshot.resourcesRemainingRatio;
  }, [snapshot.resourcesRemainingRatio]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0.85, duration: 1600, useNativeDriver: true }),
      ]),
    ).start();
  }, [heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  const gridModules = useMemo(() => {
    const byKey = new Map(modules.map((m) => [m.envelope.key, m]));
    return GRID_KEYS.map((k) => byKey.get(k)).filter(Boolean) as typeof modules;
  }, [modules]);

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
  const safe = Math.max(snapshot.safeToSpendToday, 0);
  const isWeek = horizon === 'week';
  const periodSafe = Math.max(
    isWeek ? snapshot.safeToSpendThisWeek : snapshot.safeToSpendThisMonth,
    0,
  );
  const periodDays = isWeek ? snapshot.daysLeftInWeek : snapshot.daysLeftInMonth;
  const periodShare = isWeek ? snapshot.weekShare : snapshot.monthShare;
  const periodUnit = isWeek ? '/ week' : '/ month';
  const horizonLabel = isWeek ? 'WEEK' : 'MONTH';

  type GridItem = (typeof gridModules)[number] | null;
  const withPad: GridItem[] = [...gridModules, null];
  const rows: GridItem[][] = [];
  for (let i = 0; i < withPad.length; i += 2) {
    rows.push(withPad.slice(i, i + 2));
  }

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>PAYPACE</Text>
          <StatusChip />
        </View>

        <View style={styles.availableBlock}>
          <Text style={styles.label}>AVAILABLE</Text>
          <Text style={styles.available}>{formatMoney(available, currency)}</Text>
        </View>

        <SegmentedBar
          ratio={snapshot.resourcesRemainingRatio}
          segments={10}
          height={26}
          animateFrom={drainFrom}
          tipAmber
        />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{pct}% remaining</Text>
          <Text style={styles.meta}>{snapshot.daysUntilPayday} days left</Text>
        </View>

        <View style={styles.horizonRow}>
          {(['week', 'month'] as PaceHorizon[]).map((h) => {
            const on = horizon === h;
            return (
              <Pressable
                key={h}
                onPress={() => updateSettings({ paceHorizon: h })}
                style={[styles.horizonChip, on && styles.horizonChipOn]}
              >
                <Text style={[styles.horizonChipText, on && styles.horizonChipTextOn]}>
                  {h === 'week' ? 'WEEK' : 'MONTH'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View style={{ opacity: heroPulse }}>
          <Panel glow innerGlow style={styles.heroPanel}>
            <Text style={styles.heroLabel}>SAFE TO SPEND</Text>
            <View style={styles.safeRow}>
              <View style={styles.safeCol}>
                <Text style={[styles.safe, snapshot.isAtRisk && { color: colors.danger }]}>
                  {formatMoney(safe, currency)}
                </Text>
                <Text style={styles.perUnit}>/ day</Text>
              </View>
              <View style={styles.safeDivider} />
              <View style={styles.safeCol}>
                <Text style={[styles.safeWeek, snapshot.isAtRisk && { color: colors.danger }]}>
                  {formatMoney(periodSafe, currency)}
                </Text>
                <Text style={styles.perUnit}>{periodUnit}</Text>
                <Text style={styles.weekHint}>{periodDays}d left in {isWeek ? 'week' : 'month'}</Text>
              </View>
            </View>
          </Panel>
        </Animated.View>

        {snapshot.projectedShortfallDays != null ? (
          <Panel alt style={styles.alert}>
            <Text style={styles.alertTitle}>SPENDING RATE HIGH</Text>
            <Text style={styles.alertBody}>
              At current pace, available money will be depleted {snapshot.projectedShortfallDays}{' '}
              days before your next income.
            </Text>
          </Panel>
        ) : null}

        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((mod, colIndex) =>
                mod == null ? (
                  <EmptyCell key="empty" />
                ) : (
                  <CategoryCell
                    key={mod.envelope.id}
                    title={mod.envelope.title}
                    iconKey={mod.envelope.key}
                    spent={mod.spent}
                    allocated={mod.envelope.allocated}
                    currencyCode={currency}
                    tone={mod.tone}
                    index={rowIndex * 2 + colIndex}
                    periodShare={periodShare}
                    horizonLabel={horizonLabel}
                    onPress={() => navigation.navigate('AddExpense')}
                  />
                ),
              )}
            </View>
          ))}
        </View>

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 12 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brand: {
    color: colors.text,
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  availableBlock: { gap: 2 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  available: {
    color: colors.text,
    fontSize: 42,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.body,
  },
  horizonRow: { flexDirection: 'row', gap: 8 },
  horizonChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 3,
  },
  horizonChipOn: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  horizonChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  horizonChipTextOn: { color: colors.resource },
  heroPanel: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
  },
  heroLabel: {
    color: colors.resource,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  safeCol: {
    flex: 1,
    gap: 2,
  },
  safeDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  safe: {
    color: colors.text,
    fontSize: 32,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  safeWeek: {
    color: colors.text,
    fontSize: 28,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  perUnit: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  weekHint: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  alert: { borderColor: colors.warning },
  alertTitle: {
    color: colors.warning,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontSize: 12,
    fontFamily: fonts.label,
  },
  alertBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  grid: { gap: 10, marginTop: 2 },
  gridRow: { flexDirection: 'row', gap: 10 },
});
