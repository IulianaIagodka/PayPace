import React, { useEffect, useRef } from 'react';
import {
  Animated,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Button,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  colorForTone,
  ENVELOPE_ICON_NAMES,
  segmentColor,
  toneForRatio,
  type ResourceTone,
} from '../theme/colors';
import { formatMoney, formatShortDate } from '../services/formatting';
import type { Bill, DailyExpense } from '../models/types';
import { fonts } from '../theme/fonts';
import { hud, hudType } from '../theme/hud';
import {
  HUDPanel,
  HudBody,
  HudLabel,
  HudMeta,
  HudValue,
  type HUDPanelVariant,
} from './HUDPanel';

export { HUDPanel, HudBody, HudLabel, HudMeta, HudValue };
export type { HUDPanelVariant };

/** Matches App.tsx tab bar content row (excludes safe-area inset). */
export const TAB_BAR_ROW_HEIGHT = 50;

/** Bottom padding so tab-scene content clears the absolute translucent tab bar. */
export function useTabBarClearance(extra = 24) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_ROW_HEIGHT + Math.max(insets.bottom, 10) + extra;
}

export function ScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}) {
  return (
    <View style={styles.root}>
      {/* Full-bleed backdrop under translucent tab bar — gradient only, no grain/texture */}
      <View pointerEvents="none" style={styles.backdrop}>
        <LinearGradient
          colors={['#1A1410', '#0C0A08', '#060504']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <SafeAreaView style={styles.flex} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** Legacy alias — maps glow onto HUDPanel primary; otherwise standard */
export function Panel({
  children,
  style,
  contentStyle,
  glow,
  innerGlow,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: StyleProp<ViewStyle>;
  /** @deprecated ignored — use HUDPanel variants */
  alt?: boolean;
  glow?: boolean;
  innerGlow?: boolean;
}) {
  const variant: HUDPanelVariant = glow || innerGlow ? 'primary' : 'standard';
  return (
    <HUDPanel variant={variant} style={style} contentStyle={contentStyle}>
      {children}
    </HUDPanel>
  );
}

export function StatusChip({
  label = 'OK',
  tone = 'ok',
}: {
  label?: string;
  /** Money situation — colors the chip. */
  tone?: 'ok' | 'tense' | 'critical';
}) {
  const accent =
    tone === 'critical' ? colors.danger : tone === 'tense' ? colors.warning : colors.resource;
  const bg =
    tone === 'critical'
      ? 'rgba(196, 90, 66, 0.12)'
      : tone === 'tense'
        ? 'rgba(212, 168, 74, 0.12)'
        : colors.resourceSoft;

  return (
    <View style={[styles.chip, { borderColor: accent, backgroundColor: bg }]}>
      <View style={[styles.chipDot, { backgroundColor: accent }]} />
      <Text style={[styles.chipText, { color: accent }]}>{label}</Text>
    </View>
  );
}

export function HudButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
  compact = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Tighter padding — Settings lists and dense stacks. */
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={['#1E3318', '#10180E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.btnContent}>
        {title.startsWith('+') ? (
          <>
            <Text
              style={[
                styles.btnText,
                styles.btnPlus,
                compact && styles.btnTextCompact,
                compact && styles.btnPlusCompact,
                variant === 'secondary' && { color: colors.text },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              +
            </Text>
            <Text
              style={[
                styles.btnText,
                compact && styles.btnTextCompact,
                variant === 'secondary' && { color: colors.text },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              {title.replace(/^\+\s*/, '')}
            </Text>
          </>
        ) : (
          <Text
            style={[
              styles.btnText,
              compact && styles.btnTextCompact,
              variant === 'secondary' && { color: colors.text },
              variant === 'danger' && { color: colors.danger },
            ]}
          >
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** @deprecated alias */
export const PrimaryButton = HudButton;
export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return <HudButton title={title} onPress={onPress} variant="secondary" />;
}
export const SoftCard = Panel;

export function SegmentedBar({
  ratio,
  animateFrom,
  tipAmber = true,
  height,
}: {
  ratio: number;
  /** @deprecated ignored — meter segment count is unified */
  segments?: number;
  /** Override track height; defaults to hud.meterHeight */
  height?: number;
  animateFrom?: number;
  /** @deprecated ignored — meter geometry is unified */
  compact?: boolean;
  tipAmber?: boolean;
}) {
  const segments = hud.meterSegments;
  const clamped = Math.max(0, Math.min(ratio, 1));
  const anim = useRef(new Animated.Value(animateFrom ?? clamped)).current;
  const trackHeight = height ?? hud.meterHeight;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const tone = toneForRatio(clamped);
  const lit = Math.round(clamped * segments);

  return (
    <View style={[styles.barTrack, { height: trackHeight }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const bg =
          tipAmber && tone === 'healthy'
            ? segmentColor(i, lit, tone)
            : i < lit
              ? colorForTone(tone)
              : '#12100C';
        return (
          <View
            key={i}
            style={[
              styles.barSeg,
              {
                backgroundColor: bg,
                shadowColor: i < lit && tone === 'healthy' ? colors.resource : 'transparent',
                shadowOpacity: i < lit ? 0.18 : 0,
                shadowRadius: 2,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function EnvelopeModule({
  title,
  spent,
  allocated,
  currencyCode,
  tone,
  warning,
  depleted,
}: {
  title: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  tone: ResourceTone;
  warning?: boolean;
  depleted?: boolean;
}) {
  const remaining = Math.max(allocated - spent, 0);
  const planned = Math.max(allocated, 0);
  const hasBudget = planned > 0;
  // No allocate → empty meter (same card chrome as budgeted categories).
  const remainingRatio = hasBudget ? remaining / planned : 0;
  return (
    <HUDPanel variant="compact" label={title}>
      <View style={styles.amountRow}>
        <Text style={[styles.amountLeft, { color: colorForTone(tone) }]}>
          {formatMoney(hasBudget ? remaining : Math.max(spent, 0), currencyCode)}
        </Text>
        <Text style={styles.amountSep}> / </Text>
        <Text style={styles.amountPlanned}>
          {hasBudget ? formatMoney(planned, currencyCode) : '—'}
        </Text>
      </View>
      <SegmentedBar ratio={remainingRatio} tipAmber={hasBudget} />
      {depleted ? <HudLabel tone="warn">DEPLETED</HudLabel> : null}
      {warning && !depleted && hasBudget ? (
        <HudLabel tone="warn">
          WARNING · reserve at {Math.round(remainingRatio * 100)}%
        </HudLabel>
      ) : null}
    </HUDPanel>
  );
}

export function CategoryCell({
  title,
  iconKey,
  spent,
  allocated,
  currencyCode,
  tone,
  index = 0,
  onPress,
  periodShare: _periodShare = 1,
  horizonLabel = 'CYCLE',
  depleted = false,
  layout = 'grid',
}: {
  title: string;
  iconKey: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  tone: ResourceTone;
  index?: number;
  onPress?: () => void;
  /** Fraction of cycle remaining that belongs to the selected week/month window. */
  periodShare?: number;
  horizonLabel?: string;
  depleted?: boolean;
  /** `rail` = fixed-width pod for horizontal scroll */
  layout?: 'grid' | 'rail';
}) {
  const cycleRemaining = Math.max(allocated - spent, 0);
  const planned = Math.max(allocated, 0);
  const hasBudget = planned > 0;
  // No allocate → empty meter so every card keeps the same layout.
  const remainingRatio = hasBudget ? cycleRemaining / planned : 0;
  const enter = useRef(new Animated.Value(0)).current;
  // No budget yet: still highlight when there is spend (don't look "empty").
  const muted = hasBudget ? depleted || remainingRatio <= 0 : spent <= 0;
  const tipAmber =
    hasBudget && tone === 'healthy' && remainingRatio < 0.85 && remainingRatio >= 0.4;
  const isRail = layout === 'rail';

  useEffect(() => {
    // Rail sits inside a nested horizontal ScrollView — native-driven Animated
    // wrappers steal the pan responder and break left/right scrolling.
    if (isRail) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      delay: 40 + index * 40,
      useNativeDriver: true,
    }).start();
  }, [enter, index, isRail]);

  const iconName = (ENVELOPE_ICON_NAMES[iconKey] ??
    ENVELOPE_ICON_NAMES.other) as keyof typeof Ionicons.glyphMap;

  const amountLine = (
    <View style={[styles.amountRow, isRail && styles.amountRowRail]}>
      <Text style={[styles.amountLeft, muted && { color: colors.textDim }]}>
        {formatMoney(hasBudget ? cycleRemaining : Math.max(spent, 0), currencyCode)}
      </Text>
      <Text style={styles.amountSep}> / </Text>
      <Text style={styles.amountPlanned}>
        {hasBudget ? formatMoney(planned, currencyCode) : '—'}
      </Text>
    </View>
  );

  const meter = (
    <View style={isRail ? { alignSelf: 'stretch' as const } : undefined}>
      <SegmentedBar ratio={remainingRatio} tipAmber={tipAmber} />
    </View>
  );

  const panel = (
    <HUDPanel
      variant="compact"
      label={title}
      style={isRail ? styles.cellRail : styles.cell}
      contentStyle={isRail ? styles.cellRailInner : undefined}
    >
      {isRail ? (
        <>
          <View style={styles.cellIconWrap}>
            <Ionicons
              name={iconName}
              size={18}
              color={muted ? colors.textDim : colors.resource}
            />
          </View>
          {amountLine}
          {meter}
        </>
      ) : (
        <>
          <View style={styles.cellTitleRow}>
            <Ionicons
              name={iconName}
              size={15}
              color={muted ? colors.textDim : colors.textSecondary}
            />
            <HudMeta style={{ flex: 1 }}>{muted ? 'EMPTY' : horizonLabel}</HudMeta>
          </View>
          {amountLine}
          {meter}
        </>
      )}
    </HUDPanel>
  );

  if (isRail) {
    return (
      <View style={styles.railItem}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={{ opacity: muted ? 0.48 : 1 }}
        >
          {panel}
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={{ flex: 1, opacity: muted ? 0.48 : 1 }}
      >
        {panel}
      </Pressable>
    </Animated.View>
  );
}

/** Empty steel plate to keep the 2-col grid balanced */
export function EmptyCell() {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.emptyCell} />
    </View>
  );
}

const AMOUNT_ACCESSORY_ID = 'paypace.amount.done';

/** Mount once near app root so decimal-pad fields get a Done button. */
export function AmountDoneAccessory() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
      <View style={styles.accessory}>
        <View style={{ flex: 1 }} />
        <Button title="Done" onPress={Keyboard.dismiss} color={colors.resource} />
      </View>
    </InputAccessoryView>
  );
}

export function AmountField({
  label,
  value,
  onChangeText,
  suffix = 'USD',
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
} & TextInputProps) {
  return (
    <View style={{ gap: hud.gap }}>
      <Text style={hudType.label}>{label}</Text>
      <View style={styles.fieldBox}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textDim}
          style={styles.fieldInput}
          inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
          {...rest}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

export function ExpenseRow({
  expense,
  currencyCode,
  onDelete,
  compact = false,
}: {
  expense: DailyExpense;
  currencyCode: string;
  onDelete?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={{ flex: 1, gap: compact ? 0 : 2 }}>
        <Text style={[styles.rowTitle]} numberOfLines={1}>
          {expense.name}
        </Text>
        <Text style={styles.meta}>
          {formatShortDate(expense.date)}
          {expense.memberName ? ` · ${expense.memberName}` : ''}
        </Text>
      </View>
      <Text style={styles.rowAmount}>{formatMoney(expense.amount, currencyCode)}</Text>
      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          style={[styles.deleteBtn, compact && styles.deleteBtnCompact]}
        >
          <Text style={styles.deleteText}>DEL</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function BillRow({ bill, currencyCode }: { bill: Bill; currencyCode: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{bill.name}</Text>
        <Text style={styles.meta}>{formatShortDate(bill.dueDate)}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatMoney(bill.amount, currencyCode)}</Text>
    </View>
  );
}

export function SafeSpendHero({
  safeToday,
  remaining,
  daysUntil,
  currencyCode,
  isAtRisk,
}: {
  safeToday: number;
  remaining: number;
  daysUntil: number;
  currencyCode: string;
  isAtRisk: boolean;
}) {
  return (
    <HUDPanel variant="standard" label="SAFE TO SPEND">
      <HudValue size="hero" style={isAtRisk ? { color: colors.danger } : undefined}>
        {formatMoney(Math.max(safeToday, 0), currencyCode)}
      </HudValue>
      <HudMeta>
        {formatMoney(remaining, currencyCode)} resources · {daysUntil} days left
      </HudMeta>
    </HUDPanel>
  );
}

export function CycleProgress({
  progress,
  daysElapsed,
  totalDays,
}: {
  progress: number;
  daysElapsed: number;
  totalDays: number;
}) {
  return (
    <View style={{ gap: hud.gap }}>
      <SegmentedBar ratio={1 - progress} />
      <HudMeta>
        {daysElapsed} / {totalDays} days
      </HudMeta>
    </View>
  );
}

export function HeaderIconButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.headerBtn}>
      <Text style={styles.headerBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hud.stroke,
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 0,
    backgroundColor: colors.resource,
  },
  chipText: {
    ...hudType.labelPrimary,
  },
  btn: {
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hud.stroke,
    overflow: 'hidden',
    minHeight: 54,
  },
  btnCompact: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  btnPrimary: {
    backgroundColor: '#10180E',
    borderColor: colors.resource,
    shadowColor: colors.resource,
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  btnSecondary: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.borderBright,
  },
  btnDanger: {
    backgroundColor: '#2A0A08',
    borderColor: colors.danger,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: colors.resource,
    fontSize: 15,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.6,
  },
  btnTextCompact: {
    fontSize: 12,
    letterSpacing: 1.8,
  },
  btnPlus: {
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
    marginRight: 8,
    marginTop: -1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnPlusCompact: {
    fontSize: 18,
    lineHeight: 18,
    marginRight: 6,
  },
  barTrack: {
    flexDirection: 'row',
    gap: hud.meterGap,
    backgroundColor: '#080604',
    borderWidth: hud.stroke,
    borderColor: colors.border,
    borderRadius: 0,
    padding: hud.meterPad,
  },
  barSeg: { flex: 1, borderRadius: 0 },
  cell: { flex: 1 },
  cellRail: { width: 124 },
  railItem: { width: 124 },
  cellRailInner: {
    alignItems: 'center',
  },
  cellIconWrap: {
    width: 32,
    height: 32,
    borderWidth: hud.stroke,
    borderColor: colors.borderBright,
    backgroundColor: colors.resourceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  /** Keep rail pods the same height whether the amount wraps or not. */
  amountRowRail: {
    minHeight: 40,
    justifyContent: 'center',
  },
  amountLeft: {
    ...hudType.valueCompact,
  },
  amountSep: {
    ...hudType.valueCompact,
    color: colors.textDim,
  },
  amountPlanned: {
    ...hudType.valueCompact,
    color: colors.textDim,
  },
  emptyCell: {
    flex: 1,
    minHeight: 92,
    borderRadius: 0,
    borderWidth: hud.stroke,
    borderColor: colors.borderSoft,
    backgroundColor: colors.panelDeep,
    opacity: 0.45,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelAlt,
    borderRadius: 0,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    paddingHorizontal: hud.pad,
    paddingVertical: 12,
  },
  fieldInput: {
    flex: 1,
    ...hudType.value,
    fontSize: 22,
  },
  suffix: { ...hudType.label, color: colors.textSecondary, fontSize: 14, letterSpacing: 1 },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1814',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowCompact: {
    paddingVertical: 5,
    gap: 8,
  },
  rowTitle: { ...hudType.bodyStrong },
  rowAmount: { ...hudType.valueMid },
  meta: { ...hudType.body },
  deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  deleteBtnCompact: { minHeight: 28 },
  deleteText: { ...hudType.link, color: colors.danger },
  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: hud.stroke,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 0,
  },
  headerBtnText: {
    ...hudType.label,
  },
});
