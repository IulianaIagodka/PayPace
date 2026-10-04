import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hud, hudType, tabScreen } from '../theme/hud';
import { formatMoney, formatDays } from '../services/formatting';
import { envelopesForDisplay } from '../services/envelopes';
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

/** Preferred order when spend/allocation ranks are equal */
const POPULAR_KEYS = [
  'home',
  'groceries',
  'food',
  'transport',
  'shopping',
  'kids',
  'health',
  'fun',
  'travel',
  'subscriptions',
  'other',
] as const;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, updateSettings } = useBudget();
  const currency = store.settings.currencyCode;
  const horizon: PaceHorizon = store.settings.paceHorizon ?? 'week';
  const [drainFrom, setDrainFrom] = useState<number | undefined>();
  /** Matches Spend day groups / Pace breakdown — tap header to collapse. */
  const [recentOpen, setRecentOpen] = useState(true);
  const availableRatioLive = availableRatioFor(horizon, snapshot);
  const prevRatio = useRef(availableRatioLive);
  /** Clears the absolute tab bar under scrolled panels. */
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
    () => (activeCycle ? envelopesForDisplay(activeCycle) : []),
    [activeCycle],
  );

  /** Spent / allocated first, then preferred key order */
  const railModules = useMemo(() => {
    const rank = (key: string) => {
      const i = POPULAR_KEYS.indexOf(key as (typeof POPULAR_KEYS)[number]);
      return i >= 0 ? i : POPULAR_KEYS.length;
    };
    return [...modules].sort((a, b) => {
      if (b.spent !== a.spent) return b.spent - a.spent;
      if (b.envelope.allocated !== a.envelope.allocated) {
        return b.envelope.allocated - a.envelope.allocated;
      }
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
        <View style={tabScreen.pad}>
          <Text style={hudType.brand}>
            PAY<Text style={hudType.brandAccent}>PACE</Text>
          </Text>
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
    snapshot.remainingUntilPayday < 0 ? colors.danger : colors.safeValue;

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[tabScreen.pad, { paddingBottom: tabClearance }]}
        keyboardShouldPersistTaps="handled"
      >
          <Text style={hudType.brand}>
            PAY<Text style={hudType.brandAccent}>PACE</Text>
          </Text>

          {/* 1 · Primary: today’s safe spend — the only hero number */}
          <HUDPanel variant="primary" label="SAFE TO SPEND TODAY">
            <HudValue size="hero" style={{ color: safeColor }}>
              {formatMoney(safe, currency)}
            </HudValue>
            <HudMeta>
              Your daily limit · {formatDays(snapshot.daysUntilPayday)} to payday
            </HudMeta>
          </HUDPanel>

          {/* 2 · Secondary: horizon window — compact, not competing */}
          <HUDPanel variant="compact" label="SPEND WINDOW">
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
            <Text style={styles.windowLabel}>{availableLabel}</Text>
            <Text style={styles.windowValue}>{formatMoney(availableAmount, currency)}</Text>
            <SegmentedBar ratio={availableRatio} animateFrom={drainFrom} tipAmber />
            <HudMeta>{metaLeft}</HudMeta>
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
              {railModules.length === 0 ? (
                <HUDPanel variant="standard">
                  <HudBody>
                    Categories show up here after you allocate them or log spending.
                  </HudBody>
                  <HudButton
                    title="ALLOCATE"
                    variant="secondary"
                    onPress={() => navigation.navigate('Allocate')}
                  />
                </HUDPanel>
              ) : (
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
                      onPress={() =>
                        navigation.navigate('Activity', {
                          groupBy: 'category',
                          category: mod.envelope.category,
                          envelopeKey: mod.envelope.key,
                        })
                      }
                    />
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <HUDPanel variant="compact" label="CATEGORIES · PLUS">
              <HudBody>
                Plus shows what’s left in each category and lets you set those budgets.
              </HudBody>
              <HudButton
                title="SEE PLUS"
                variant="secondary"
                compact
                onPress={() => navigation.navigate('Settings')}
              />
            </HUDPanel>
          )}

          <HUDPanel variant="standard">
            <View style={styles.recentHead}>
              <Pressable
                onPress={() => setRecentOpen((v) => !v)}
                style={styles.recentHeadText}
                accessibilityRole="button"
                accessibilityState={{ expanded: recentOpen }}
                accessibilityLabel={
                  recent.length === 0
                    ? 'Recent spend'
                    : `Recent spend, ${recent.length} entr${recent.length === 1 ? 'y' : 'ies'}`
                }
              >
                <Text style={hudType.label}>RECENT SPEND</Text>
                <HudMeta>
                  {recent.length === 0
                    ? 'No expenses yet'
                    : recentOpen
                      ? 'Hide recent entries'
                      : `${recent.length} entr${recent.length === 1 ? 'y' : 'ies'}`}
                </HudMeta>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Activity')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Open spend log"
              >
                <Text style={hudType.link}>SPEND ›</Text>
              </Pressable>
              <Pressable
                onPress={() => setRecentOpen((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={recentOpen ? 'Collapse recent spend' : 'Expand recent spend'}
              >
                <Ionicons
                  name={recentOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.borderBright}
                />
              </Pressable>
            </View>
            {recentOpen ? (
              recent.length === 0 ? (
                <HudBody>No expenses yet.</HudBody>
              ) : (
                recent.map((e) => (
                  <ExpenseRow key={e.id} expense={e} currencyCode={currency} />
                ))
              )
            ) : null}
          </HUDPanel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rangeBtn: {
    flex: 1,
    minHeight: 32,
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
    ...hudType.label,
    color: colors.textDim,
  },
  rangeTextOn: {
    color: colors.ammo,
  },
  windowLabel: {
    ...hudType.meta,
    color: colors.textSecondary,
  },
  windowValue: {
    ...hudType.valueMid,
    fontSize: 20,
    color: colors.ammo,
  },
  railBlock: { gap: hud.gap },
  // Clip to the same content width as HUD panels above — overflow:visible
  // let pods paint into screenPad and look wider while scrolling.
  railScroll: { overflow: 'hidden' },
  rail: { gap: 12, paddingRight: 0, paddingVertical: 2, flexGrow: 0 },
  recentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recentHeadText: {
    flex: 1,
    gap: 2,
  },
});
