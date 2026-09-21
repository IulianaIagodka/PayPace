import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CategoryCell,
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
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const GRID_KEYS = new Set(['food', 'transport', 'kids', 'fun', 'home']);

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const prevRatio = useRef(snapshot.resourcesRemainingRatio);
  const heroPulse = useRef(new Animated.Value(0.55)).current;
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
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heroPulse, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(heroPulse, {
            toValue: 0.45,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [brandIn, heroPulse]);

  const modules = useMemo(
    () => (activeCycle ? envelopeStatuses(activeCycle) : []),
    [activeCycle],
  );

  const gridModules = useMemo(
    () => modules.filter((m) => GRID_KEYS.has(m.envelope.key)),
    [modules],
  );

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.brand}>
            PAY<Text style={styles.brandAccent}>PACE</Text>
          </Text>
          <Text style={styles.sub}>No active cycle. Configure resources in Settings.</Text>
          <HudButton title="SETTINGS" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScreenBackground>
    );
  }

  const available = Math.max(snapshot.remainingUntilPayday, 0);
  const pct = Math.round(snapshot.resourcesRemainingRatio * 100);

  const rows: (typeof gridModules)[] = [];
  for (let i = 0; i < gridModules.length; i += 2) {
    rows.push(gridModules.slice(i, i + 2));
  }

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={{
            opacity: brandIn,
            transform: [
              {
                translateY: brandIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <View style={styles.brandMarkInner} />
            </View>
            <View>
              <Text style={styles.brand}>
                PAY<Text style={styles.brandAccent}>PACE</Text>
              </Text>
              <Text style={styles.brandTag}>RESOURCE CONTROL</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.availableBlock}>
          <Text style={styles.label}>AVAILABLE</Text>
          <Text style={styles.available}>{formatMoney(available, currency)}</Text>
        </View>

        <Panel alt>
          <View style={styles.reserveHead}>
            <Text style={styles.label}>RESERVE</Text>
            <Text style={styles.reservePct}>{pct}%</Text>
          </View>
          <SegmentedBar
            ratio={snapshot.resourcesRemainingRatio}
            segments={12}
            height={26}
            animateFrom={drainFrom}
          />
          <Text style={styles.meta}>
            {pct}% resources remaining · {snapshot.daysUntilPayday} days left
          </Text>
        </Panel>

        <Animated.View
          style={{
            opacity: heroPulse.interpolate({
              inputRange: [0.45, 1],
              outputRange: [0.92, 1],
            }),
          }}
        >
          <Panel glow style={styles.heroPanel}>
            <LinearGradient
              colors={['rgba(125,255,86,0.14)', 'rgba(125,255,86,0.02)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroRail} />
            <Text style={styles.heroLabel}>SAFE TO SPEND</Text>
            <Text
              style={[
                styles.safe,
                snapshot.isAtRisk && { color: colors.danger },
              ]}
            >
              {formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
              <Text style={styles.perDay}> / day</Text>
            </Text>
            <Text style={styles.heroSub}>DAILY AUTHORIZATION · UNTIL NEXT PAYDAY</Text>
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

        <HudButton title="+ ADD EXPENSE" onPress={() => navigation.navigate('AddExpense')} />

        <View style={styles.sectionHead}>
          <Text style={styles.label}>LOADOUT</Text>
          <Text style={styles.sectionHint}>CATEGORY CELLS</Text>
        </View>

        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((m, colIndex) => (
                <CategoryCell
                  key={m.envelope.id}
                  title={m.envelope.title}
                  iconKey={m.envelope.key}
                  spent={m.spent}
                  allocated={m.envelope.allocated}
                  currencyCode={currency}
                  tone={m.tone}
                  index={rowIndex * 2 + colIndex}
                  onPress={() => navigation.navigate('AddExpense')}
                />
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 18, paddingBottom: 36, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  brandMark: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: colors.resource,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelDeep,
    shadowColor: colors.resource,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  brandMarkInner: {
    width: 14,
    height: 14,
    backgroundColor: colors.resource,
    borderRadius: 1,
    opacity: 0.9,
  },
  brand: {
    color: colors.text,
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 3.5,
  },
  brandAccent: { color: colors.resource },
  brandTag: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginTop: 2,
  },
  availableBlock: { gap: 4 },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2,
  },
  available: {
    color: colors.text,
    fontSize: 42,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  reserveHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reservePct: {
    color: colors.resource,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.body,
    letterSpacing: 0.3,
  },
  heroPanel: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 6,
    overflow: 'hidden',
  },
  heroRail: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: colors.resource,
    opacity: 0.85,
  },
  heroLabel: {
    color: colors.resource,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  safe: {
    color: colors.resource,
    fontSize: 40,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  perDay: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: fonts.label,
    fontWeight: '600',
    letterSpacing: 1,
  },
  heroSub: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
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
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionHint: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
});
