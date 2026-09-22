import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CategoryCell,
  EmptyCell,
  ExpenseRow,
  HudBody,
  HudButton,
  HUDPanel,
  HudMeta,
  HudValue,
  PanelLabel,
  ScreenBackground,
  SegmentedBar,
  StatusChip,
  TelemetryCell,
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

const GRID_KEYS = new Set(['food', 'transport', 'kids', 'fun', 'home']);

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.92)).current;
  const brandIn = useRef(new Animated.Value(0)).current;

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
    Animated.parallel([
      Animated.timing(brandIn, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heroPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(heroPulse, { toValue: 0.9, duration: 2000, useNativeDriver: true }),
        ]),
      ),
    ]).start();
  }, [brandIn, heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  const gridModules = useMemo(
    () => modules.filter((m) => GRID_KEYS.has(String(m.envelope.key))),
    [modules],
  );

  const recent = useMemo(() => {
    const list = [...(activeCycle?.expenses ?? [])];
    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return list.slice(0, 3);
  }, [activeCycle?.expenses]);

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.brand}>PAYPACE</Text>
          <HudBody>No active resource cycle. Initialize in Settings.</HudBody>
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
  const reservesAmount = isWeek ? periodSafe : available;
  const reservesLabel = isWeek ? 'RESERVES · THIS WEEK' : 'RESERVES · UNTIL CHECKPOINT';
  const burnDaily =
    snapshot.daysElapsed > 0 ? snapshot.spentThisCycle / Math.max(snapshot.daysElapsed, 1) : 0;
  const burnHot = burnDaily > safe && safe > 0;
  const statusTone =
    snapshot.trajectory === 'DEFICIT'
      ? 'danger'
      : snapshot.trajectory === 'LOW RESERVE' || burnHot
        ? 'warn'
        : 'ok';
  const statusLabel =
    snapshot.trajectory === 'DEFICIT'
      ? 'CRITICAL'
      : snapshot.trajectory === 'LOW RESERVE'
        ? 'LOW RESERVE'
        : burnHot
          ? 'BURN HIGH'
          : snapshot.trajectory === 'WITH RESERVE'
            ? 'STABLE'
            : 'ON PACE';
  const chipLabel =
    snapshot.remainingUntilPayday < 0
      ? 'SYSTEM CRITICAL'
      : snapshot.isAtRisk
        ? 'SYSTEM WARN'
        : 'SYSTEM ONLINE';
  const safeColor =
    snapshot.remainingUntilPayday < 0 ? colors.danger : colors.safeValue;

  const rows: (typeof gridModules)[] = [];
  for (let i = 0; i < gridModules.length; i += 2) {
    rows.push(gridModules.slice(i, i + 2));
  }

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={[
            styles.brandRow,
            {
              opacity: brandIn,
              transform: [
                {
                  translateY: brandIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>
              PAY<Text style={styles.brandAccent}>PACE</Text>
            </Text>
            <Text style={styles.sysTag}>RESOURCE CONTROL // PAYDAY CYCLE</Text>
          </View>
          <StatusChip label={chipLabel} />
        </Animated.View>

        <HUDPanel variant="standard" label={reservesLabel} labelTone="warn">
          <HudValue>{formatMoney(reservesAmount, currency)}</HudValue>
          <SegmentedBar
            ratio={snapshot.resourcesRemainingRatio}
            animateFrom={drainFrom}
            tipAmber
          />
          <View style={styles.metaRow}>
            <HudMeta>{pct}% RESOURCES REMAINING</HudMeta>
            <HudMeta>
              {isWeek
                ? `${periodDays}D RUNWAY · WEEK`
                : `${snapshot.daysUntilPayday}D TO CHECKPOINT`}
            </HudMeta>
          </View>
          {isWeek ? (
            <HudMeta>
              CYCLE RESERVE {formatMoney(available, currency)} · {snapshot.daysUntilPayday}D TO
              PAYDAY
            </HudMeta>
          ) : null}
        </HUDPanel>

        <Animated.View style={{ opacity: heroPulse }}>
          <HUDPanel variant="primary" label="RECOMMENDED PACING">
            <View style={styles.paceRow}>
              <HudValue size="hero" style={{ color: safeColor }}>
                {formatMoney(safe, currency)}
              </HudValue>
              <Text style={hudType.unit}>/ DAY</Text>
            </View>
            <HudMeta>Daily drain ceiling until next checkpoint</HudMeta>
          </HUDPanel>
        </Animated.View>

        <HUDPanel variant="standard">
          <View style={styles.telemetryRow}>
            <TelemetryCell
              label="BURN RATE"
              value={`${formatMoney(burnDaily, currency)}/D`}
              tone={burnHot ? 'warn' : 'normal'}
            />
            <View style={styles.telemetryDivider} />
            <TelemetryCell
              label="CHECKPOINT"
              value={`${snapshot.daysUntilPayday}D`}
              tone="normal"
            />
            <View style={styles.telemetryDivider} />
            <TelemetryCell label="STATUS" value={statusLabel} tone={statusTone} />
          </View>
        </HUDPanel>

        {snapshot.projectedShortfallDays != null ? (
          <HUDPanel variant="standard" label="BURN RATE CRITICAL" labelTone="warn">
            <HudBody>
              At current drain, reserves deplete {snapshot.projectedShortfallDays} days before
              checkpoint.
            </HudBody>
          </HUDPanel>
        ) : null}

        {store.settings.isPremium ? (
          <View style={styles.modulesBlock}>
            <PanelLabel>MODULES</PanelLabel>
            <View style={styles.grid}>
              {rows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {row.map((mod, index) => (
                    <CategoryCell
                      key={mod.envelope.id}
                      title={mod.envelope.title}
                      iconKey={mod.envelope.key}
                      spent={mod.spent}
                      allocated={mod.envelope.allocated}
                      currencyCode={currency}
                      tone={mod.tone}
                      depleted={mod.depleted}
                      index={rowIndex * 2 + index}
                      periodShare={periodShare}
                      layout="grid"
                      onPress={() => navigation.navigate('AddExpense')}
                    />
                  ))}
                  {row.length === 1 ? <EmptyCell /> : null}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <HUDPanel variant="standard" label="MODULES · PLUS" labelTone="warn">
            <HudBody>
              Plus unlocks per-module reserves — food, transport, kids, and the rest — so you can
              watch each resource cell drain.
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
            <PanelLabel>DRAIN LOG</PanelLabel>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>FULL LOG ›</Text>
            </Pressable>
          </View>
          <HUDPanel variant="standard">
            {recent.length === 0 ? (
              <HudBody>No drain events logged.</HudBody>
            ) : (
              recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} currencyCode={currency} />
              ))
            )}
          </HUDPanel>
        </View>

        <HudButton title="+ LOG EXPENSE" onPress={() => navigation.navigate('AddExpense')} />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 12,
  },
  brandBlock: { flex: 1, gap: 4 },
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
  sysTag: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  telemetryRow: { flexDirection: 'row', alignItems: 'center' },
  telemetryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  modulesBlock: { gap: 10 },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
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
