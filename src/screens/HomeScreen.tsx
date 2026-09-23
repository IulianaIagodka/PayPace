import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useTabBarClearance,
} from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hud, hudType } from '../theme/hud';
import { formatMoney, formatDays } from '../services/formatting';
import { envelopeStatuses } from '../services/envelopes';
import {
  AVAILABLE_RANGE_OPTIONS,
  availableAmountFor,
  availableHorizonLabel,
  availableLabelFor,
  availableMetaLeftFor,
  availablePeriodShare,
  availableRatioFor,
} from '../services/availableRange';
import type { PaceHorizon } from '../models/calculator';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Most-used category order when spend is equal / zero */
const POPULAR_KEYS = ['food', 'home', 'kids', 'fun', 'transport', 'other'] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateSettings } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  const availableRatioLive = availableRatioFor(horizon, snapshot);
  const prevRatio = useRef(availableRatioLive);
  const tabClearance = useTabBarClearance(28);

  useEffect(() => {
    if (prevRatio.current > availableRatioLive) {
      setDrainFrom(prevRatio.current);
      const t = setTimeout(() => setDrainFrom(undefined), 220);
      prevRatio.current = availableRatioLive;
      return () => clearTimeout(t);
    }
    prevRatio.current = availableRatioLive;
  }, [availableRatioLive]);

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

  const safe = Math.max(snapshot.safeToSpendToday, 0);
  const availableAmount = availableAmountFor(horizon, snapshot);
  const availableRatio = availableRatioLive;
  const pct = Math.round(availableRatio * 100);
  const periodShare = availablePeriodShare(horizon, snapshot);
  const horizonLabel = availableHorizonLabel(horizon);
  const availableLabel = availableLabelFor(horizon);
  const metaLeft = availableMetaLeftFor(horizon, snapshot, pct);
  const safeColor =
    snapshot.remainingUntilPayday < 0 ? colors.danger : colors.resource;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: tabClearance }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>
          PAY<Text style={styles.brandAccent}>PACE</Text>
        </Text>

        <HUDPanel variant="standard" label="SAFE TO SPEND TODAY" labelTone="primary">
          <HudValue size="hero" style={{ color: safeColor }}>
            {formatMoney(safe, currency)}
          </HudValue>
        </HUDPanel>

        <HUDPanel variant="standard" label={availableLabel}>
          <View style={styles.rangeRow}>
            {AVAILABLE_RANGE_OPTIONS.map((opt) => {
              const on = opt.value === horizon;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updateSettings({ paceHorizon: opt.value })}
                  style={[styles.rangeBtn, on && styles.rangeBtnOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.rangeText, on && styles.rangeTextOn]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <HudValue>{formatMoney(availableAmount, currency)}</HudValue>
          <SegmentedBar
            ratio={availableRatio}
            animateFrom={drainFrom}
            tipAmber
            height={22}
          />
          <View style={styles.metaRow}>
            <HudMeta>{metaLeft}</HudMeta>
            <HudMeta style={styles.daysMeta}>
              {formatDays(snapshot.daysUntilPayday)} to payday
            </HudMeta>
          </View>
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
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
              style={styles.railScroll}
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
            <PlusUnlockButton />
          </HUDPanel>
        )}

        <View style={styles.recentBlock}>
          <View style={styles.recentHead}>
            <Text style={hudType.label}>RECENT</Text>
            <Pressable onPress={() => navigation.navigate('Activity')}>
              <Text style={styles.seeAll}>SPEND ›</Text>
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
    gap: hud.stackGap,
  },
  brand: {
    color: colors.text,
    fontSize: 26,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 4.5,
    marginBottom: 2,
  },
  brandAccent: {
    color: colors.resource,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  daysMeta: {
    textTransform: 'none',
    letterSpacing: 0.4,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rangeBtn: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panelDeep,
    paddingHorizontal: 6,
  },
  rangeBtnOn: {
    borderColor: colors.borderBright,
    backgroundColor: colors.panelAlt,
  },
  rangeText: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  rangeTextOn: {
    color: colors.ammo,
  },
  railBlock: { gap: hud.gap },
  railScroll: { overflow: 'visible' },
  rail: { gap: 10, paddingRight: 8, paddingVertical: 2, flexGrow: 0 },
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
