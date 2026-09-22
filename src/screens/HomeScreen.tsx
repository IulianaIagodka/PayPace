import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  ExpenseRow,
  HudButton,
  Panel,
  ResourceBattery,
  ScreenBackground,
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

/** Primary category pods on Home — Food, Home, Kids, Fun */
const HOME_CATS = ['food', 'home', 'kids', 'fun'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.94)).current;

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
        Animated.timing(heroPulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0.95, duration: 2600, useNativeDriver: true }),
      ]),
    ).start();
  }, [heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  const homeCats = useMemo(() => {
    const byKey = new Map(modules.map((m) => [m.envelope.key, m]));
    return HOME_CATS.map((k) => byKey.get(k)).filter(Boolean) as typeof modules;
  }, [modules]);

  const recent = useMemo(() => {
    const list = [...(activeCycle?.expenses ?? [])];
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return list.slice(0, 4);
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
  const periodUnit = isWeek ? 'WEEK' : 'PAYDAY';
  const safeColor = snapshot.remainingUntilPayday < 0 ? colors.danger : colors.safeValue;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandCol}>
            <Text style={styles.brand}>
              PAY<Text style={styles.brandAccent}>PACE</Text>
            </Text>
            <Text style={styles.tagline}>RESOURCE CONSOLE</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>LIVE</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: heroPulse }}>
          <Panel glow innerGlow style={styles.availablePanel}>
            <Text style={styles.moduleStamp}>ENERGY CELL · PRIMARY</Text>
            <Text style={styles.label}>TOTAL AVAILABLE</Text>
            <Text style={styles.available}>{formatMoney(available, currency)}</Text>
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <Text style={[styles.splitValue, { color: safeColor }]}>
                  {formatMoney(safe, currency)}
                </Text>
                <Text style={styles.splitUnit}>/ DAY</Text>
              </View>
              <View style={styles.splitDivider} />
              <View style={styles.splitCol}>
                <Text style={[styles.splitValueWeek, { color: safeColor }]}>
                  {formatMoney(periodSafe, currency)}
                </Text>
                <Text style={styles.splitUnit}>/ {periodUnit}</Text>
                <Text style={styles.splitHint}>
                  {isWeek
                    ? `${periodDays}D LEFT IN WEEK`
                    : `${snapshot.daysUntilPayday}D TO PAYDAY`}
                </Text>
              </View>
            </View>
          </Panel>
        </Animated.View>

        <Panel style={styles.budgetPanel}>
          <View style={styles.budgetHead}>
            <Text style={styles.sectionLabel}>BUDGET ENERGY MODULE</Text>
            <Text style={styles.pctRemain}>{pct}% LEFT</Text>
          </View>
          <ResourceBattery
            ratio={snapshot.resourcesRemainingRatio}
            segments={12}
            animateFrom={drainFrom}
            tipAmber
          />
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{formatMoney(spent, currency)} spent</Text>
            <Text style={styles.meta}>{formatMoney(cyclePool, currency)} pool</Text>
            <Text style={styles.meta}>{snapshot.daysUntilPayday}D → PAYDAY</Text>
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
              {homeCats.map((mod, index) => (
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
            <Text style={styles.alertTitle}>CATEGORY CELLS · PLUS</Text>
            <Text style={styles.alertBody}>
              Plus unlocks Food, Home, Kids, and Fun cells with remaining energy per category.
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
  pad: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 32, gap: 16 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.45)',
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
    letterSpacing: 2.6,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    backgroundColor: colors.resource,
  },
  onlineText: {
    color: colors.resource,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2,
  },
  availablePanel: { gap: 8 },
  moduleStamp: {
    color: colors.metalDim,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: -2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  available: {
    color: colors.text,
    fontSize: 38,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  splitCol: { flex: 1, gap: 2 },
  splitDivider: {
    width: 1,
    backgroundColor: colors.borderBright,
    marginVertical: 2,
  },
  splitValue: {
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  splitValueWeek: {
    fontSize: 22,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  splitUnit: {
    color: colors.metal,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  splitHint: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  budgetPanel: { gap: 10 },
  budgetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
