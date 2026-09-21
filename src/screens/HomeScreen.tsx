import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  HudButton,
  MottoSlot,
  Panel,
  ScreenBackground,
  SegmentedBar,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { formatMoney } from '../services/formatting';
import { envelopeStatuses } from '../services/envelopes';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const GRID_KEYS = ['food', 'transport', 'kids', 'fun', 'home'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.7)).current;

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
        Animated.timing(heroPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0.7, duration: 1400, useNativeDriver: true }),
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

  const cells: Array<{ type: 'cat'; mod: (typeof modules)[0] } | { type: 'motto' }> = [
    ...gridModules.map((mod) => ({ type: 'cat' as const, mod })),
    { type: 'motto' },
  ];

  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(cells.slice(i, i + 2));
  }

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>PAYPACE</Text>
          <Text style={styles.brandMotto}>DISCIPLINE BUILDS{'\n'}FREEDOM.</Text>
        </View>

        <View style={styles.availableBlock}>
          <Text style={styles.label}>AVAILABLE</Text>
          <View style={styles.availableRow}>
            <Text style={styles.available}>{formatMoney(available, currency)}</Text>
            <Text style={styles.sideHint}>
              PLAN TRACK{'\n'}PROGRESS{'\n'}A CALMER YOU.
            </Text>
          </View>
        </View>

        <SegmentedBar
          ratio={snapshot.resourcesRemainingRatio}
          segments={10}
          height={28}
          animateFrom={drainFrom}
          tipAmber
        />
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{pct}% resources remaining</Text>
          <Text style={styles.meta}>{snapshot.daysUntilPayday} days left</Text>
        </View>

        <Animated.View
          style={{
            opacity: heroPulse.interpolate({
              inputRange: [0.7, 1],
              outputRange: [0.94, 1],
            }),
          }}
        >
          <Panel glow innerGlow style={styles.heroPanel}>
            <View style={styles.heroBody}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.heroLabel}>SAFE TO SPEND</Text>
                <Text style={[styles.safe, snapshot.isAtRisk && { color: colors.danger }]}>
                  {formatMoney(safe, currency)}
                  <Text style={styles.perDay}>/day</Text>
                </Text>
              </View>
              <Text style={styles.heroSide}>
                STAY ON{'\n'}TRACK{'\n'}LIVE{'\n'}BETTER.
              </Text>
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
              {row.map((cell, colIndex) =>
                cell.type === 'motto' ? (
                  <MottoSlot key="motto" text="DIFFERENT CHOICES A BRIGHTER TOMORROW." />
                ) : (
                  <CategoryCell
                    key={cell.mod.envelope.id}
                    title={cell.mod.envelope.title}
                    iconKey={cell.mod.envelope.key}
                    spent={cell.mod.spent}
                    allocated={cell.mod.envelope.allocated}
                    currencyCode={currency}
                    tone={cell.mod.tone}
                    index={rowIndex * 2 + colIndex}
                    onPress={() => navigation.navigate('AddExpense')}
                  />
                ),
              )}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 12 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 4,
  },
  brandMotto: {
    color: colors.textDim,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'right',
    lineHeight: 12,
    marginTop: 4,
  },
  availableBlock: { gap: 2 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  available: {
    color: colors.text,
    fontSize: 44,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -1,
    flexShrink: 1,
  },
  sideHint: {
    color: colors.textDim,
    fontSize: 8,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    lineHeight: 11,
    textAlign: 'right',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
  },
  heroPanel: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLabel: {
    color: colors.resource,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.6,
  },
  safe: {
    color: colors.text,
    fontSize: 38,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  perDay: {
    color: colors.textSecondary,
    fontSize: 18,
    fontFamily: fonts.label,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroSide: {
    color: colors.textDim,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.3,
    lineHeight: 12,
    textAlign: 'right',
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
  grid: { gap: 10, marginTop: 4 },
  gridRow: { flexDirection: 'row', gap: 10 },
});
