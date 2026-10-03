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
  testID,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: StyleProp<ViewStyle>;
  /** @deprecated ignored — use HUDPanel variants */
  alt?: boolean;
  glow?: boolean;
  innerGlow?: boolean;
  testID?: string;
}) {
  const variant: HUDPanelVariant = glow || innerGlow ? 'primary' : 'standard';
  return (
    <HUDPanel testID={testID} variant={variant} style={style} contentStyle={contentStyle}>
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
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Tighter padding — Settings lists and dense stacks. */
  compact?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={title}
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
export function SecondaryButton({
  title,
  onPress,
  testID,
}: {
  title: string;
  onPress: () => void;
  testID?: string;
}) {
  return <HudButton testID={testID} title={title} onPress={onPress} variant="secondary" />;
}
export const SoftCard = Panel;

export function SegmentedBar({
  ratio,
  animateFrom,
  tipAmber = true,
  /** `remaining` = depleting reserve; `spent` = fill-up usage (colors still from leftover). */
  mode = 'remaining',
  /** Force one tone for all lit segments (category rail — no red/amber mix). */
  lockTone,
}: {
  ratio: number;
  /** @deprecated ignored — meter segment count is unified via hud.meterSegments */
  segments?: number;
  /** @deprecated ignored — meter height is unified via hud.meterHeight */
  height?: number;
  animateFrom?: number;
  /** @deprecated ignored — meter geometry is unified */
  compact?: boolean;
  tipAmber?: boolean;
  mode?: 'remaining' | 'spent';
  lockTone?: ResourceTone;
}) {
  const segments = hud.meterSegments;
  const clamped = Math.max(0, Math.min(ratio, 1));
  const anim = useRef(new Animated.Value(animateFrom ?? clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  // Fill amount follows `ratio`; tone reflects leftover unless locked.
  const tone = lockTone ?? toneForRatio(mode === 'spent' ? 1 - clamped : clamped);
  const useTipAmber = tipAmber && !lockTone;
  const lit = Math.round(clamped * segments);

  return (
    <View style={styles.barTrack}>
      {Array.from({ length: segments }).map((_, i) => {
        const bg =
          useTipAmber && tone === 'healthy'
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
  const used = Math.max(spent, 0);
  const planned = Math.max(allocated, 0);
  const hasBudget = planned > 0;
  const remainingRatio = hasBudget ? Math.max(planned - used, 0) / planned : 0;
  const spentRatio = hasBudget ? Math.min(used / planned, 1) : 0;
  return (
    <HUDPanel variant="compact" label={title}>
      <View style={styles.amountRow}>
        <Text style={[styles.amountLeft, { color: colorForTone(tone) }]}>
          {formatMoney(used, currencyCode)}
        </Text>
        <Text style={styles.amountSep}> / </Text>
        <Text style={styles.amountPlanned}>
          {hasBudget ? formatMoney(planned, currencyCode) : '—'}
        </Text>
      </View>
      <SegmentedBar ratio={spentRatio} mode="spent" tipAmber={hasBudget} />
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
  tone: _tone,
  index = 0,
  onPress,
  periodShare: _periodShare = 1,
  horizonLabel = 'CYCLE',
  depleted = false,
  layout = 'grid',
  testID,
}: {
  title: string;
  iconKey: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  /** Kept for call-site compat — category rail uses one resource green accent. */
  tone: ResourceTone;
  index?: number;
  onPress?: () => void;
  /** Fraction of cycle remaining that belongs to the selected week/month window. */
  periodShare?: number;
  horizonLabel?: string;
  depleted?: boolean;
  /** `rail` = fixed-width pod for horizontal scroll */
  layout?: 'grid' | 'rail';
  testID?: string;
}) {
  const used = Math.max(spent, 0);
  const planned = Math.max(allocated, 0);
  const hasBudget = planned > 0;
  const left = Math.max(planned - used, 0);
  const remainingRatio = hasBudget ? left / planned : 0;
  // Budgeted: meter = remaining. Unbudgeted with spend: full spent cue.
  const meterRatio = hasBudget ? remainingRatio : used > 0 ? 1 : 0;
  const enter = useRef(new Animated.Value(0)).current;
  const muted = hasBudget ? depleted || remainingRatio <= 0 : false;
  const isRail = layout === 'rail';
  // One accent for every category pod — no red/amber/green mix across the rail.
  const accent = muted ? colors.textSecondary : colors.resource;

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

  const meter = (
    <View style={isRail ? styles.railMeter : undefined}>
      <SegmentedBar
        ratio={meterRatio}
        mode={hasBudget ? 'remaining' : 'spent'}
        tipAmber={false}
        lockTone="healthy"
      />
    </View>
  );

  const panel = isRail ? (
    <HUDPanel
      variant="compact"
      seed={`category:${iconKey}:${title}`}
      style={styles.cellRail}
      contentStyle={styles.cellRailInner}
    >
      <View style={styles.railTop}>
        <View style={[styles.cellIconWrap, muted && styles.cellIconWrapMuted]}>
          <Ionicons name={iconName} size={16} color={accent} />
        </View>
        <Text style={styles.railTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text style={[styles.railValue, muted && { color: colors.textSecondary }]} numberOfLines={1}>
        {hasBudget ? formatMoney(left, currencyCode) : formatMoney(used, currencyCode)}
      </Text>
      <Text style={styles.railMeta} numberOfLines={1}>
        {hasBudget
          ? muted
            ? 'DEPLETED'
            : `LEFT · ${formatMoney(planned, currencyCode)} PLAN`
          : used > 0
            ? 'SPENT · NO PLAN'
            : 'TAP TO LOG'}
      </Text>
      {meter}
    </HUDPanel>
  ) : (
    <HUDPanel
      variant="compact"
      label={title}
      seed={`category:${iconKey}:${title}`}
      style={styles.cell}
    >
      <View style={styles.cellTitleRow}>
        <Ionicons name={iconName} size={15} color={accent} />
        <HudMeta style={{ flex: 1 }}>{muted ? 'EMPTY' : horizonLabel}</HudMeta>
      </View>
      <View style={styles.amountRow}>
        <Text style={[styles.amountLeft, muted && { color: colors.textSecondary }]} numberOfLines={1}>
          {formatMoney(used, currencyCode)}
        </Text>
        {hasBudget ? (
          <>
            <Text style={styles.amountSep}> / </Text>
            <Text style={styles.amountPlanned} numberOfLines={1}>
              {formatMoney(planned, currencyCode)}
            </Text>
          </>
        ) : null}
      </View>
      {meter}
    </HUDPanel>
  );

  const cellTestID = testID ?? `home.category.${iconKey}`;

  if (isRail) {
    return (
      <View style={styles.railItem} testID={cellTestID}>
        <Pressable onPress={onPress} disabled={!onPress} testID={`${cellTestID}.press`}>
          {panel}
        </Pressable>
      </View>
    );
  }

  return (
    <Animated.View
      testID={cellTestID}
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
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
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
  testID,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  suffix?: string;
  testID?: string;
} & TextInputProps) {
  return (
    <View style={{ gap: hud.gap }}>
      <Text style={hudType.label}>{label}</Text>
      <View style={styles.fieldBox}>
        <TextInput
          testID={testID}
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
  const dayNumber = Math.min(Math.max(daysElapsed, 0) + 1, Math.max(totalDays, 1));
  return (
    <View style={{ gap: hud.gap }}>
      <SegmentedBar ratio={1 - progress} />
      <HudMeta>
        Day {dayNumber} of {totalDays}
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
    height: hud.meterHeight,
    gap: hud.meterGap,
    backgroundColor: '#080604',
    borderWidth: hud.stroke,
    borderColor: colors.border,
    borderRadius: 0,
    padding: hud.meterPad,
  },
  barSeg: { flex: 1, borderRadius: 0 },
  cell: { flex: 1 },
  cellRail: { width: 152 },
  railItem: { width: 152 },
  cellRailInner: {
    gap: 8,
    minHeight: 108,
  },
  railTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  railTitle: {
    ...hudType.label,
    color: colors.text,
    flex: 1,
    letterSpacing: 1.6,
  },
  railValue: {
    ...hudType.valueMid,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  railMeta: {
    ...hudType.meta,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  railMeter: {
    alignSelf: 'stretch',
    marginTop: 2,
  },
  cellIconWrap: {
    width: 28,
    height: 28,
    borderWidth: hud.stroke,
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cellIconWrapMuted: {
    borderColor: colors.border,
    backgroundColor: 'rgba(90, 80, 64, 0.14)',
  },
  cellTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
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
