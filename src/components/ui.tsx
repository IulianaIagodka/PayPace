import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
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

function Rivets() {
  return (
    <>
      <View style={[styles.rivet, styles.rivetTL]} />
      <View style={[styles.rivet, styles.rivetTR]} />
      <View style={[styles.rivet, styles.rivetBL]} />
      <View style={[styles.rivet, styles.rivetBR]} />
    </>
  );
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
      <LinearGradient
        colors={['#121614', '#0A0C0B', '#070807']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.metalNoise} />
      <SafeAreaView style={styles.flex} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** Gunmetal panel with chamfered corners + rivets */
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
        colors={alt ? ['#2A312C', '#1E2420', '#181C19'] : ['#262C28', '#1A1F1C', '#151A17']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={[styles.panel, innerGlow && styles.panelInnerGlow]}
      >
        <View style={[styles.bevel, styles.bevelTL]} />
        <View style={[styles.bevel, styles.bevelBR]} />
        <Rivets />
        {children}
      </LinearGradient>
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
          colors={['#2A5A30', '#163D1C', '#0F2A14']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.btnContent}>
        {variant === 'primary' ? (
          <Ionicons name="add" size={22} color={colors.resource} style={{ marginRight: 4 }} />
        ) : null}
        <Text
          style={[
            styles.btnText,
            variant === 'secondary' && { color: colors.text },
            variant === 'danger' && { color: colors.text },
          ]}
        >
          {title.replace(/^\+\s*/, '')}
        </Text>
      </View>
      {variant === 'primary' ? (
        <View style={styles.btnStripes}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={styles.btnStripe} />
          ))}
        </View>
      ) : null}
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
      duration: 220,
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
              : '#151A16';
        return (
          <View
            key={i}
            style={[
              styles.barSeg,
              compact && styles.barSegCompact,
              {
                backgroundColor: bg,
                shadowColor: i < lit && tone === 'healthy' ? colors.resource : 'transparent',
                shadowOpacity: i < lit ? 0.65 : 0,
                shadowRadius: compact ? 3 : 5,
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

/** Reference-style category cell: icon + title, spent/budget, bar, % */
export function CategoryCell({
  title,
  iconKey,
  spent,
  allocated,
  currencyCode,
  tone,
  index = 0,
  onPress,
}: {
  title: string;
  iconKey: string;
  spent: number;
  allocated: number;
  currencyCode: string;
  tone: ResourceTone;
  index?: number;
  onPress?: () => void;
}) {
  // Reference shows remaining / allocated with remaining %
  const remaining = Math.max(allocated - spent, 0);
  const remainingRatio = allocated > 0 ? remaining / allocated : 0;
  const pct = Math.round(remainingRatio * 100);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 280,
      delay: 60 + index * 45,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const fill = colorForTone(tone);
  const iconName = (ENVELOPE_ICON_NAMES[iconKey] ?? ENVELOPE_ICON_NAMES.other) as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
        <Panel style={styles.cell}>
          <View style={styles.cellTop}>
            <View style={styles.cellTitleRow}>
              <Ionicons name={iconName} size={16} color={colors.textSecondary} />
              <Text style={styles.cellTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <Text style={styles.cellAmount} numberOfLines={1}>
              {formatMoney(remaining, currencyCode)}
              <Text style={styles.cellAmountDim}> / {formatMoney(allocated, currencyCode)}</Text>
            </Text>
          </View>
          <View style={styles.cellBarRow}>
            <View style={{ flex: 1 }}>
              <SegmentedBar ratio={remainingRatio} segments={8} height={10} compact tipAmber />
            </View>
            <Text style={[styles.cellPct, { color: fill }]}>{pct}%</Text>
          </View>
        </Panel>
      </Pressable>
    </Animated.View>
  );
}

export function MottoSlot({ text }: { text: string }) {
  return (
    <View style={styles.mottoSlot}>
      <Text style={styles.mottoSlotText}>{text}</Text>
    </View>
  );
}

export function AmountField({
  label,
  value,
  onChangeText,
  suffix = 'PLN',
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
  metalNoise: {
    ...StyleSheet.absoluteFill,
    opacity: 0.04,
    backgroundColor: colors.metal,
  },
  panelWrap: {},
  panelGlow: {
    shadowColor: colors.resource,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  panel: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  panelInnerGlow: {
    borderColor: colors.resource,
    borderWidth: 1.5,
    shadowColor: colors.resource,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  bevel: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: colors.borderBright,
    opacity: 0.7,
  },
  bevelTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  bevelBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  rivet: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4A544C',
    borderWidth: 1,
    borderColor: '#2A322C',
  },
  rivetTL: { top: 6, left: 6 },
  rivetTR: { top: 6, right: 6 },
  rivetBL: { bottom: 6, left: 6 },
  rivetBR: { bottom: 6, right: 6 },
  btn: {
    borderRadius: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 56,
  },
  btnPrimary: {
    backgroundColor: '#163D1C',
    borderColor: colors.resource,
    shadowColor: colors.resource,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  btnSecondary: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: '#2A1210',
    borderColor: colors.danger,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  btnStripes: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    paddingRight: 8,
    opacity: 0.35,
    transform: [{ skewX: '-18deg' }],
  },
  btnStripe: {
    width: 3,
    height: '100%',
    backgroundColor: colors.resource,
  },
  btnText: {
    color: colors.resource,
    fontSize: 16,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  barTrack: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#0B0E0C',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 3,
  },
  barTrackCompact: { gap: 2, padding: 2, borderRadius: 3 },
  barSeg: { flex: 1, borderRadius: 2 },
  barSegCompact: { borderRadius: 1 },
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
  cell: { gap: 10, paddingVertical: 12, paddingHorizontal: 12, minHeight: 96 },
  cellTop: { gap: 6 },
  cellTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  cellAmount: {
    fontSize: 13,
    fontFamily: fonts.display,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  cellAmountDim: { color: colors.textDim, fontWeight: '600' },
  cellBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cellPct: {
    fontSize: 12,
    fontFamily: fonts.display,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  mottoSlot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    minHeight: 96,
  },
  mottoSlotText: {
    color: colors.textDim,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.5,
    lineHeight: 16,
    textTransform: 'uppercase',
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.display,
  },
  suffix: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600', fontFamily: fonts.body },
  rowAmount: { color: colors.text, fontSize: 15, fontWeight: '700', fontFamily: fonts.display },
  meta: { color: colors.textSecondary, fontSize: 12, fontFamily: fonts.body },
  deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  heroAmount: { color: colors.text, fontSize: 40, fontWeight: '800', fontFamily: fonts.display },
  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 6,
  },
  headerBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: fonts.label,
  },
});
