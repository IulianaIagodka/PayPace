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
import {
  CONTROL_PANEL_COPY,
  buildControlPanelView,
  filterControlGridModules,
  pairModuleRows,
  recentDrainEvents,
} from '../services/controlPanel';
import type { PaceHorizon } from '../models/calculator';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, setPremium } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.92)).current;
  const brandIn = useRef(new Animated.Value(0)).current;
  const copy = CONTROL_PANEL_COPY;

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

  const gridModules = useMemo(() => filterControlGridModules(modules), [modules]);

  const recent = useMemo(
    () => recentDrainEvents(activeCycle?.expenses ?? [], 3),
    [activeCycle?.expenses],
  );

  const panel = useMemo(
    () => buildControlPanelView(snapshot, horizon, (n) => formatMoney(n, currency)),
    [snapshot, horizon, currency],
  );

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

  const safeColor = panel.pacingTone === 'danger' ? colors.danger : colors.safeValue;
  const rows = pairModuleRows(gridModules);

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
            <Text style={styles.sysTag}>{copy.home.sysTag}</Text>
          </View>
          <StatusChip label={panel.chipLabel} />
        </Animated.View>

        <HUDPanel variant="standard" label={panel.reservesLabel} labelTone="warn">
          <HudValue>{formatMoney(panel.reservesAmount, currency)}</HudValue>
          <SegmentedBar
            ratio={snapshot.resourcesRemainingRatio}
            animateFrom={drainFrom}
            tipAmber
          />
          <View style={styles.metaRow}>
            <HudMeta>{panel.resourcesPct}% RESOURCES REMAINING</HudMeta>
            <HudMeta>{panel.runwayLabel}</HudMeta>
          </View>
          {panel.weekHint ? <HudMeta>{panel.weekHint}</HudMeta> : null}
        </HUDPanel>

        <Animated.View style={{ opacity: heroPulse }}>
          <HUDPanel variant="primary" label={copy.home.pacingLabel}>
            <View style={styles.paceRow}>
              <HudValue size="hero" style={{ color: safeColor }}>
                {formatMoney(panel.recommendedPacing, currency)}
              </HudValue>
              <Text style={hudType.unit}>/ DAY</Text>
            </View>
            <HudMeta>{copy.home.pacingHint}</HudMeta>
          </HUDPanel>
        </Animated.View>

        <HUDPanel variant="standard">
          <View style={styles.telemetryRow}>
            <TelemetryCell
              label="BURN RATE"
              value={`${formatMoney(panel.burnDaily, currency)}/D`}
              tone={panel.burnHot ? 'warn' : 'normal'}
            />
            <View style={styles.telemetryDivider} />
            <TelemetryCell
              label="CHECKPOINT"
              value={`${panel.checkpointDays}D`}
              tone="normal"
            />
            <View style={styles.telemetryDivider} />
            <TelemetryCell
              label="STATUS"
              value={panel.statusLabel}
              tone={panel.statusTone}
            />
          </View>
        </HUDPanel>

        {snapshot.projectedShortfallDays != null ? (
          <HUDPanel variant="standard" label={copy.home.burnCriticalTitle} labelTone="warn">
            <HudBody>
              At current drain, reserves deplete {snapshot.projectedShortfallDays} days before
              checkpoint.
            </HudBody>
          </HUDPanel>
        ) : null}

        {store.settings.isPremium ? (
          <View style={styles.modulesBlock}>
            <PanelLabel>{copy.home.modulesLabel}</PanelLabel>
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
                      periodShare={panel.periodShare}
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
          <HUDPanel variant="standard" label={copy.home.modulesPlusTitle} labelTone="warn">
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
            <PanelLabel>{copy.home.drainLogLabel}</PanelLabel>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>FULL LOG ›</Text>
            </Pressable>
          </View>
          <HUDPanel variant="standard">
            {recent.length === 0 ? (
              <HudBody>{copy.home.drainEmpty}</HudBody>
            ) : (
              recent.map((e) => (
                <ExpenseRow key={e.id} expense={e} currencyCode={currency} />
              ))
            )}
          </HUDPanel>
        </View>

        <HudButton title={copy.home.logExpense} onPress={() => navigation.navigate('AddExpense')} />
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
