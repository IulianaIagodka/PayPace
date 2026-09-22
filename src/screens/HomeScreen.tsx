import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  ExpenseRow,
  HudButton,
  Panel,
  ScreenBackground,
  SegmentedBar,
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

const RAIL_KEYS = ['food', 'home', 'kids', 'fun', 'transport'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.92)).current;

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
        Animated.timing(heroPulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0.94, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();
  }, [heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  const railModules = useMemo(() => {
    const byKey = new Map(modules.map((m) => [m.envelope.key, m]));
    const ordered = RAIL_KEYS.map((k) => byKey.get(k)).filter(Boolean) as typeof modules;
    const extras = modules.filter((m) => !RAIL_KEYS.includes(m.envelope.key as (typeof RAIL_KEYS)[number]));
    return [...ordered, ...extras];
  }, [modules]);

  const recent = useMemo(() => {
    const list = [...(activeCycle?.expenses ?? [])];
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return list.slice(0, 5);
  }, [activeCycle?.expenses]);

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.brand}>PAYPACE</Text>
          <Text style={styles.sub}>No active budget yet. Set one up in Settings.</Text>
          <HudButton title="SETTINGS" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScreenBackground>
    );
  }

  const available = Math.max(snapshot.remainingUntilPayday, 0);
  const spent = snapshot.spentThisCycle;
  const cyclePool = Math.max(available + spent, spent, 1);
  const pct = Math.round(snapshot.resourcesRemainingRatio * 100);
  const safe = Math.max(snapshot.safeToSpendToday, 0);
  const isWeek = horizon === 'week';
  const periodSafe = Math.max(
    isWeek ? snapshot.safeToSpendThisWeek : snapshot.safeToSpendThisMonth,
    0,
  );
  const periodDays = isWeek ? snapshot.daysLeftInWeek : snapshot.daysLeftInMonth;
  const periodShare = isWeek ? snapshot.weekShare : snapshot.monthShare;
  const periodUnit = isWeek ? '/ WEEK' : '/ CYCLE';
  const stable = snapshot.projectedShortfallDays == null && snapshot.remainingUntilPayday >= 0;
  const safeColor = snapshot.remainingUntilPayday < 0 ? colors.danger : colors.safeValue;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandCol}>
            <Text style={styles.brand}>
              PAY<Text style={styles.brandAccent}>PACE</Text>
            </Text>
            <Text style={styles.tagline}>MONEY KEEPS YOU MOVING</Text>
          </View>
          <View style={styles.planCol}>
            <Text style={styles.planLine}>PLAN</Text>
            <Text style={styles.planLine}>TRACK</Text>
            <Text style={styles.planLine}>PROCEED</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: heroPulse }}>
          <Panel glow innerGlow style={styles.availablePanel}>
            <View style={styles.availableInner}>
              <View style={styles.availableMain}>
                <Text style={styles.label}>TOTAL AVAILABLE</Text>
                <Text style={styles.available}>{formatMoney(available, currency)}</Text>
                <Text style={styles.steady}>
                  {stable ? 'Steady progress. Keep going.' : 'Pace needs attention.'}
                </Text>
              </View>
              <View style={styles.stabilityBox}>
                <Ionicons
                  name={stable ? 'shield-checkmark-outline' : 'warning-outline'}
                  size={18}
                  color={stable ? colors.resource : colors.warning}
                />
                <Text style={[styles.stabilityText, !stable && { color: colors.warning }]}>
                  {stable ? 'FINANCIAL STABILITY AHEAD' : 'SPENDING PACE HIGH'}
                </Text>
              </View>
            </View>
          </Panel>
        </Animated.View>

        <Panel style={styles.cyclePanel}>
          <View style={styles.cycleHead}>
            <Text style={styles.sectionLabel}>PAY CYCLE</Text>
            <Text style={styles.pctRemain}>{pct}% REMAINING</Text>
          </View>
          <SegmentedBar
            ratio={snapshot.resourcesRemainingRatio}
            segments={12}
            height={18}
            animateFrom={drainFrom}
            tipAmber
          />
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatMoney(spent, currency)} spent</Text>
            <Text style={styles.meta}>{formatMoney(cyclePool, currency)} pool</Text>
            <Text style={styles.meta}>{snapshot.daysUntilPayday}D TO PAYDAY</Text>
          </View>
        </Panel>

        <Panel style={styles.safePanel}>
          <Text style={styles.heroLabel}>SAFE TO SPEND</Text>
          <View style={styles.safeRow}>
            <View style={styles.safeCol}>
              <Text style={[styles.safe, { color: safeColor }]}>{formatMoney(safe, currency)}</Text>
              <Text style={styles.perUnit}>/ DAY</Text>
            </View>
            <View style={styles.safeDivider} />
            <View style={styles.safeCol}>
              <Text style={[styles.safeWeek, { color: safeColor }]}>
                {formatMoney(periodSafe, currency)}
              </Text>
              <Text style={styles.perUnit}>{periodUnit}</Text>
              <Text style={styles.weekHint}>
                {isWeek
                  ? `${periodDays}D LEFT IN WEEK`
                  : `${snapshot.daysUntilPayday}D UNTIL PAYDAY`}
              </Text>
            </View>
          </View>
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

        {store.settings.isPremium ? (
          <View style={styles.railBlock}>
            <Text style={styles.sectionLabel}>CATEGORIES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {railModules.map((mod, index) => (
                <CategoryCell
                  key={mod.envelope.id}
                  title={mod.envelope.title}
                  iconKey={mod.envelope.key}
                  spent={mod.spent}
                  allocated={mod.envelope.allocated}
                  currencyCode={currency}
                  tone={mod.tone}
                  depleted={mod.depleted}
                  index={index}
                  periodShare={periodShare}
                  layout="rail"
                  onPress={() => navigation.navigate('AddExpense')}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <Panel alt>
            <Text style={styles.alertTitle}>CATEGORY REMAINING · PLUS</Text>
            <Text style={styles.alertBody}>
              Plus shows how much is left in each category — food, transport, kids, and the rest —
              and lets you set those amounts.
            </Text>
            <HudButton
              title="TRY PLUS (DEMO)"
              onPress={() => setPremium(true)}
              variant="secondary"
            />
          </Panel>
        )}

        <View style={styles.recentBlock}>
          <View style={styles.recentHead}>
            <Text style={styles.sectionLabel}>RECENT</Text>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>ACTIVITY ›</Text>
            </Pressable>
          </View>
          <Panel>
            {recent.length === 0 ? (
              <Text style={styles.sub}>No expenses yet.</Text>
            ) : (
              recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} currencyCode={currency} showChevron />
              ))
            )}
          </Panel>
        </View>

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brandCol: { gap: 4, flex: 1 },
  brand: {
    color: colors.text,
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  brandAccent: {
    color: colors.resource,
  },
  tagline: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  planCol: { alignItems: 'flex-end', gap: 1, paddingTop: 4 },
  planLine: {
    color: colors.textSecondary,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  availablePanel: { paddingVertical: 16, paddingHorizontal: 14 },
  availableInner: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  availableMain: { flex: 1, gap: 4 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  available: {
    color: colors.text,
    fontSize: 36,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  steady: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  stabilityBox: {
    width: 92,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stabilityText: {
    color: colors.resource,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textAlign: 'center',
    lineHeight: 12,
  },
  cyclePanel: { gap: 10 },
  cycleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  pctRemain: {
    color: colors.resource,
    fontSize: 13,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  meta: {
    color: colors.metal,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  safePanel: { gap: 10, paddingVertical: 14 },
  heroLabel: {
    color: colors.resource,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.8,
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
    backgroundColor: colors.borderBright,
    marginVertical: 4,
  },
  safe: {
    color: colors.safeValue,
    fontSize: 30,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  safeWeek: {
    color: colors.safeValue,
    fontSize: 24,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  perUnit: {
    color: colors.metal,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  weekHint: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  alert: { borderColor: colors.warning },
  alertTitle: {
    color: colors.warning,
    fontWeight: '700',
    letterSpacing: 1.6,
    fontSize: 12,
    fontFamily: fonts.label,
  },
  alertBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  railBlock: { gap: 10 },
  rail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  recentBlock: { gap: 10 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: {
    color: colors.resource,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});
