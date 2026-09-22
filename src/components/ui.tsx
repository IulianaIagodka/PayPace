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
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export function ScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A1410', '#0C0A08', '#060504']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Scanline grit — Doom CRT feel */}
      <View pointerEvents="none" style={styles.scanlines}>
        {Array.from({ length: 48 }).map((_, i) => (
          <View key={i} style={styles.scanline} />
        ))}
      </View>
      <View pointerEvents="none" style={styles.vignette} />
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
  glow,
  innerGlow,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  /** @deprecated ignored — use HUDPanel variants */
  alt?: boolean;
  glow?: boolean;
  innerGlow?: boolean;
}) {
  const variant: HUDPanelVariant = glow || innerGlow ? 'primary' : 'standard';
  return (
    <HUDPanel variant={variant} style={style}>
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
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
                variant === 'secondary' && { color: colors.text },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              +
            </Text>
            <Text
              style={[
                styles.btnText,
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
  const remainingRatio = planned > 0 ? remaining / planned : 0;
  return (
    <HUDPanel variant="compact" label={title}>
      <View style={styles.amountRow}>
        <Text style={[styles.amountLeft, { color: colorForTone(tone) }]}>
          {formatMoney(remaining, currencyCode)}
        </Text>
        <Text style={styles.amountSep}> / </Text>
        <Text style={styles.amountPlanned}>{formatMoney(planned, currencyCode)}</Text>
      </View>
      <SegmentedBar ratio={remainingRatio} tipAmber />
      {depleted ? <HudLabel tone="warn">DEPLETED</HudLabel> : null}
      {warning && !depleted ? (
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
  const remainingRatio = planned > 0 ? cycleRemaining / planned : 0;
  const enter = useRef(new Animated.Value(0)).current;
  const muted = depleted || remainingRatio <= 0;
  const tipAmber = tone === 'healthy' && remainingRatio < 0.85 && remainingRatio >= 0.4;
  const isRail = layout === 'rail';

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      delay: 40 + index * 40,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const iconName = (ENVELOPE_ICON_NAMES[iconKey] ??
    ENVELOPE_ICON_NAMES.other) as keyof typeof Ionicons.glyphMap;

  const amountLine = (
    <View style={styles.amountRow}>
      <Text style={[styles.amountLeft, muted && { color: colors.textDim }]}>
        {formatMoney(cycleRemaining, currencyCode)}
      </Text>
      <Text style={styles.amountSep}> / </Text>
      <Text style={styles.amountPlanned}>{formatMoney(planned, currencyCode)}</Text>
    </View>
  );

  return (
    <Animated.View
      style={{
        flex: isRail ? undefined : 1,
        width: isRail ? 124 : undefined,
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
        style={{ flex: isRail ? undefined : 1, opacity: muted ? 0.48 : 1 }}
      >
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
              <View style={{ alignSelf: 'stretch' }}>
                <SegmentedBar ratio={remainingRatio} tipAmber={tipAmber} />
              </View>
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
              <SegmentedBar ratio={remainingRatio} tipAmber={tipAmber} />
            </>
          )}
        </HUDPanel>
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
}: {
  expense: DailyExpense;
  currencyCode: string;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{expense.name}</Text>
        <Text style={styles.meta}>
          {formatShortDate(expense.date)}
          {expense.memberName ? ` · ${expense.memberName}` : ''}
        </Text>
      </View>
      <Text style={styles.rowAmount}>{formatMoney(expense.amount, currencyCode)}</Text>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
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
  root: { flex: 1, backgroundColor: colors.bg },
  scanlines: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.07,
    justifyContent: 'space-between',
  },
  scanline: {
    height: 1,
    backgroundColor: '#000',
  },
  vignette: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 18,
    borderColor: 'rgba(0,0,0,0.45)',
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
    color: colors.resource,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
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
  btnPlus: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0,
    marginRight: 8,
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
  amountLeft: {
    ...hudType.valueCompact,
  },
  amountSep: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.display,
  },
  amountPlanned: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fonts.display,
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.ammo,
    fontFamily: fonts.display,
  },
  suffix: { color: colors.textSecondary, fontSize: 16, fontWeight: '600', fontFamily: fonts.label },
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1814',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.body },
  rowAmount: { color: colors.ammo, fontSize: 15, fontWeight: '700', fontFamily: fonts.display },
  meta: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
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
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: fonts.label,
    textTransform: 'uppercase',
  },
});
