import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  ExpenseRow,
  HudBody,
  HudButton,
  HUDPanel,
  HudMeta,
  HudValue,
  ScreenBackground,
  SegmentedBar,
  StatusChip,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hud, hudType } from '../theme/hud';
import { formatMoney } from '../services/formatting';
import { envelopeStatuses } from '../services/envelopes';
import type { PaceHorizon } from '../models/calculator';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Most-used category order when spend is equal / zero */
const POPULAR_KEYS = ['food', 'home', 'kids', 'fun', 'transport', 'other'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.88)).current;

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
        Animated.timing(heroPulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(heroPulse, { toValue: 0.92, duration: 2200, useNativeDriver: true }),
      ]),
    ).start();
  }, [heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  /** Popular first: by spend desc, then preferred key order */
  const railModules = useMemo(() => {
    const rank = (key: string) => {
      const i = POPULAR_KEYS.indexOf(key as (typeof POPULAR_KEYS)[number]);
      return i >= 0 ? i : POPULAR_KEYS.length;
    };
    return [...modules].sort((a, b) => {
      if (b.spent !== a.spent) return b.spent - a.spent;
      return rank(String(a.envelope.key)) - rank(String(b.envelope.key));
    });
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
          <Text style={hudType.body}>No active budget yet. Set one up in Settings.</Text>
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
  const horizonLabel = isWeek ? 'WEEK' : 'CYCLE';
  const availableLabel = isWeek ? 'AVAILABLE THIS WEEK' : 'AVAILABLE UNTIL PAYDAY';
  const safeColor =
    snapshot.remainingUntilPayday < 0 ? colors.danger : colors.safeValue;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Text style={styles.brand}>
            PAY<Text style={styles.brandAccent}>PACE</Text>
          </Text>
          <StatusChip />
        </View>

        <Animated.View style={{ opacity: heroPulse }}>
          <HUDPanel variant="primary" label="SAFE TO SPEND TODAY">
            <HudValue size="hero" style={{ color: safeColor }}>
              {formatMoney(safe, currency)}
            </HudValue>
            <Text style={hudType.unit}>/ DAY</Text>
          </HUDPanel>
        </Animated.View>

        <HUDPanel variant="standard" label={availableLabel}>
          <HudValue>{formatMoney(isWeek ? periodSafe : available, currency)}</HudValue>
          <SegmentedBar
            ratio={snapshot.resourcesRemainingRatio}
            animateFrom={drainFrom}
            tipAmber
          />
          <View style={styles.metaRow}>
            <HudMeta>{pct}% REMAINING</HudMeta>
            <HudMeta>
              {isWeek
                ? `${periodDays}D LEFT IN WEEK`
                : `${snapshot.daysUntilPayday}D TO PAYDAY`}
            </HudMeta>
          </View>
          {isWeek ? (
            <Text style={styles.weekHint}>
              Cycle left {formatMoney(available, currency)} · {snapshot.daysUntilPayday}D to payday
            </Text>
          ) : null}
        </HUDPanel>

        {snapshot.projectedShortfallDays != null ? (
          <HUDPanel variant="standard" label="SPENDING RATE HIGH" labelTone="warn">
            <HudBody>
              At current pace, available money will be depleted {snapshot.projectedShortfallDays}{' '}
              days before your next income.
            </HudBody>
          </HUDPanel>
        ) : null}

        {store.settings.isPremium ? (
          <View style={styles.railBlock}>
            <Text style={hudType.label}>CATEGORIES</Text>
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
                  horizonLabel={horizonLabel}
                  layout="rail"
                  onPress={() => navigation.navigate('AddExpense')}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <HUDPanel variant="standard" label="CATEGORY REMAINING · PLUS">
            <HudBody>
              Plus shows how much is left in each category — food, transport, kids, and the rest —
              and lets you set those amounts.
            </HudBody>
            <HudButton
              title="TRY PLUS (DEMO)"
              onPress={() => setPremium(true)}
              variant="secondary"
            />
          </HUDPanel>
        )}

        <View style={styles.recentBlock}>
          <View style={styles.recentHead}>
            <Text style={hudType.label}>RECENT ACTIVITY</Text>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>ACTIVITY ›</Text>
            </Pressable>
          </View>
          <HUDPanel variant="standard">
            {recent.length === 0 ? (
              <HudBody>No expenses yet.</HudBody>
            ) : (
              recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} currencyCode={currency} />
              ))
            )}
          </HUDPanel>
        </View>

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: hud.screenPad,
    paddingTop: 10,
    paddingBottom: 28,
    gap: hud.stackGap,
  },
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
    letterSpacing: 4.5,
  },
  brandAccent: {
    color: colors.resource,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekHint: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  railBlock: { gap: hud.gap },
  rail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  recentBlock: { gap: hud.gap },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: {
    color: colors.resource,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
