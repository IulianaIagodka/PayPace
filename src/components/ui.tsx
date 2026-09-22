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

/** Steel plate — thick bevel + rivets */
export function Panel({
  children,
  style,
  alt,
  glow,
  innerGlow,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  alt?: boolean;
  glow?: boolean;
  innerGlow?: boolean;
}) {
  return (
    <View style={[styles.panelWrap, glow && styles.panelGlow, style]}>
      <LinearGradient
        colors={alt ? ['#2E2820', '#1A1612'] : ['#262218', '#141210']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.panel, innerGlow && styles.panelInnerGlow]}
      >
        <View style={[styles.bevel, styles.bevelTL]} />
        <View style={[styles.bevel, styles.bevelTR]} />
        <View style={[styles.bevel, styles.bevelBL]} />
        <View style={[styles.bevel, styles.bevelBR]} />
        <View style={[styles.rivet, styles.rivetTL]} />
        <View style={[styles.rivet, styles.rivetTR]} />
        <View style={[styles.rivet, styles.rivetBL]} />
        <View style={[styles.rivet, styles.rivetBR]} />
        {children}
      </LinearGradient>
    </View>
  );
}

export function StatusChip({ label = 'ONLINE' }: { label?: string }) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipDot} />
      <Text style={styles.chipText}>{label}</Text>
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
  segments = 10,
  height = 22,
  animateFrom,
  compact,
  tipAmber = true,
}: {
  ratio: number;
  segments?: number;
  height?: number;
  animateFrom?: number;
  compact?: boolean;
  tipAmber?: boolean;
}) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const anim = useRef(new Animated.Value(animateFrom ?? clamped)).current;

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
    <View style={[styles.barTrack, { height }, compact && styles.barTrackCompact]}>
      {Array.from({ length: segments }).map((_, i) => {
        const bg =
          tipAmber && tone === 'healthy'
            ? segmentColor(i, lit, tone)
            : i < lit
              ? colorForTone(tone)
              : '#121512';
        return (
          <View
            key={i}
            style={[
              styles.barSeg,
              compact && styles.barSegCompact,
              {
                backgroundColor: bg,
                shadowColor: i < lit && tone === 'healthy' ? colors.resource : 'transparent',
                shadowOpacity: i < lit ? 0.18 : 0,
                shadowRadius: compact ? 1 : 2,
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
  const remainingRatio = allocated > 0 ? Math.max(allocated - spent, 0) / allocated : 0;
  return (
    <Panel style={styles.module}>
      <View style={styles.moduleHead}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={[styles.moduleAmount, { color: colorForTone(tone) }]}>
          {formatMoney(spent, currencyCode)} / {formatMoney(allocated, currencyCode)}
        </Text>
      </View>
      <SegmentedBar ratio={remainingRatio} segments={8} height={12} compact />
      {depleted ? <Text style={styles.criticalLabel}>DEPLETED</Text> : null}
      {warning && !depleted ? (
        <Text style={styles.warnLabel}>
          WARNING · reserve at {Math.round(remainingRatio * 100)}%
        </Text>
      ) : null}
    </Panel>
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
  periodShare = 1,
  horizonLabel = 'CYCLE',
  depleted = false,
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
}) {
  const cycleRemaining = Math.max(allocated - spent, 0);
  const periodRemaining = cycleRemaining * Math.max(0, Math.min(periodShare, 1));
  const remainingRatio = allocated > 0 ? cycleRemaining / allocated : 0;
  const enter = useRef(new Animated.Value(0)).current;
  const muted = depleted || remainingRatio <= 0;
  // Mid reserves tip amber; high reserves stay full green — status via bar behavior only.
  const tipAmber = tone === 'healthy' && remainingRatio < 0.85 && remainingRatio >= 0.4;

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
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, opacity: muted ? 0.48 : 1 }}>
        <Panel style={styles.cell}>
          <View style={styles.cellTitleRow}>
            <Ionicons
              name={iconName}
              size={15}
              color={muted ? colors.textDim : colors.textSecondary}
            />
            <Text style={[styles.cellTitle, muted && { color: colors.textDim }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cellHorizon}>{muted ? 'EMPTY' : horizonLabel}</Text>
          </View>
          <Text style={[styles.cellAmount, muted && { color: colors.textDim }]} numberOfLines={1}>
            {formatMoney(periodRemaining, currencyCode)}
            <Text style={styles.cellAmountDim}>
              {' '}
              / {formatMoney(cycleRemaining, currencyCode)}
            </Text>
          </Text>
          <SegmentedBar
            ratio={remainingRatio}
            segments={8}
            height={9}
            compact
            tipAmber={tipAmber}
          />
        </Panel>
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
    <View style={{ gap: 8 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
    <View style={{ gap: 10 }}>
      <Text style={styles.fieldLabel}>SAFE TO SPEND</Text>
      <Text style={[styles.heroAmount, isAtRisk && { color: colors.danger }]}>
        {formatMoney(Math.max(safeToday, 0), currencyCode)}
      </Text>
      <Text style={styles.meta}>
        {formatMoney(remaining, currencyCode)} resources · {daysUntil} days left
      </Text>
    </View>
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
    <View style={{ gap: 8 }}>
      <SegmentedBar ratio={1 - progress} segments={12} height={10} />
      <Text style={styles.meta}>
        {daysElapsed} / {totalDays} days
      </Text>
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
  panelWrap: {},
  panelGlow: {
    shadowColor: colors.resource,
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  panel: {
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    overflow: 'hidden',
  },
  panelInnerGlow: {
    borderColor: colors.resource,
    borderWidth: 2,
  },
  bevel: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: colors.borderBright,
    opacity: 1,
  },
  bevelTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  bevelTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bevelBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bevelBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  rivet: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: colors.metalDim,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
  rivetTL: { top: 5, left: 5 },
  rivetTR: { top: 5, right: 5 },
  rivetBL: { bottom: 5, left: 5 },
  rivetBR: { bottom: 5, right: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
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
    letterSpacing: 2,
  },
  btn: {
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
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
    gap: 2,
    backgroundColor: '#080604',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    padding: 3,
  },
  barTrackCompact: { gap: 2, padding: 2 },
  barSeg: { flex: 1, borderRadius: 0 },
  barSegCompact: { borderRadius: 0 },
  module: { gap: 8 },
  moduleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  moduleTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  moduleAmount: { color: colors.text, fontSize: 13, fontWeight: '700', fontFamily: fonts.body },
  warnLabel: { color: colors.warning, fontSize: 11, letterSpacing: 0.8, fontWeight: '600' },
  criticalLabel: { color: colors.critical, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  cell: { gap: 8, paddingVertical: 12, paddingHorizontal: 12, minHeight: 92 },
  cellTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cellHorizon: {
    color: colors.textDim,
    fontSize: 9,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cellAmount: {
    fontSize: 13,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: colors.ammo,
  },
  cellAmountDim: { color: colors.textDim, fontWeight: '600' },
  emptyCell: {
    flex: 1,
    minHeight: 92,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    backgroundColor: colors.panelDeep,
    opacity: 0.45,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelAlt,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ammo,
    fontFamily: fonts.display,
  },
  suffix: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
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
  heroAmount: { color: colors.ammo, fontSize: 40, fontWeight: '800', fontFamily: fonts.display },
  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 2,
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
  },
});
