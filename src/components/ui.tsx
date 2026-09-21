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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  colorForTone,
  ENVELOPE_ICONS,
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
        colors={['#0D1812', '#070908', '#040605']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.scanLines}>
        {Array.from({ length: 28 }).map((_, i) => (
          <View key={i} style={styles.scanLine} />
        ))}
      </View>
      <View pointerEvents="none" style={styles.cornerFrameTL} />
      <View pointerEvents="none" style={styles.cornerFrameBR} />
      <SafeAreaView style={styles.flex} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

/** Gunmetal panel with chamfered corner notches */
export function Panel({
  children,
  style,
  alt,
  glow,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  alt?: boolean;
  glow?: boolean;
}) {
  return (
    <View style={[styles.panelWrap, glow && styles.panelGlow, style]}>
      <View style={[styles.panel, alt && styles.panelAlt]}>
        <View style={[styles.chamfer, styles.chamferTL]} />
        <View style={[styles.chamfer, styles.chamferTR]} />
        <View style={[styles.chamfer, styles.chamferBL]} />
        <View style={[styles.chamfer, styles.chamferBR]} />
        {children}
      </View>
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
          colors={['#1A3D22', '#0F2416']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.btnNotch, styles.btnNotchL]} />
      <View style={[styles.btnNotch, styles.btnNotchR]} />
      <Text
        style={[
          styles.btnText,
          variant === 'secondary' && { color: colors.text },
          variant === 'danger' && { color: colors.text },
        ]}
      >
        {title}
      </Text>
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
}: {
  ratio: number;
  segments?: number;
  height?: number;
  /** When set, briefly animate from this ratio to `ratio`. */
  animateFrom?: number;
  compact?: boolean;
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
  const fill = colorForTone(tone);
  const lit = Math.round(clamped * segments);

  return (
    <View style={[styles.barTrack, { height }, compact && styles.barTrackCompact]}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.barSeg,
            compact && styles.barSegCompact,
            {
              backgroundColor: i < lit ? fill : colors.borderSoft,
              shadowColor: i < lit && tone === 'healthy' ? colors.resource : 'transparent',
              shadowOpacity: i < lit ? 0.7 : 0,
              shadowRadius: compact ? 3 : 5,
              elevation: i < lit ? 2 : 0,
            },
          ]}
        />
      ))}
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

/** Compact 2-column category cell for the home loadout grid */
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
  const remaining = Math.max(allocated - spent, 0);
  const remainingRatio = allocated > 0 ? remaining / allocated : 0;
  const pct = Math.round(remainingRatio * 100);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      delay: 80 + index * 55,
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const fill = colorForTone(tone);
  const icon = ENVELOPE_ICONS[iconKey] ?? ENVELOPE_ICONS.other;

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1 }}>
        <Panel style={styles.cell}>
          <View style={styles.cellHead}>
            <View style={[styles.cellIcon, { borderColor: fill }]}>
              <Text style={[styles.cellIconText, { color: fill }]}>{icon}</Text>
            </View>
            <Text style={styles.cellTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Text style={[styles.cellAmount, { color: fill }]} numberOfLines={1}>
            {formatMoney(remaining, currencyCode)}
          </Text>
          <Text style={styles.cellMeta}>{pct}% LEFT</Text>
          <SegmentedBar ratio={remainingRatio} segments={6} height={8} compact />
        </Panel>
      </Pressable>
    </Animated.View>
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

/** Kept for older screens that still reference these. */
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
  scanLines: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-evenly',
    opacity: 0.07,
    paddingVertical: 8,
  },
  scanLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.resource,
  },
  cornerFrameTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.borderBright,
    opacity: 0.45,
  },
  cornerFrameBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderBright,
    opacity: 0.35,
  },
  panelWrap: {},
  panelGlow: {
    shadowColor: colors.resource,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  panelAlt: { backgroundColor: colors.panelAlt },
  chamfer: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: colors.borderBright,
  },
  chamferTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  chamferTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  chamferBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  chamferBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  btn: {
    borderRadius: 3,
    paddingVertical: 17,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  btnPrimary: {
    backgroundColor: '#14301A',
    borderColor: colors.resource,
    shadowColor: colors.resource,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  btnSecondary: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: '#2A1210',
    borderColor: colors.danger,
  },
  btnNotch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 8,
    borderColor: colors.resource,
    opacity: 0.7,
  },
  btnNotchL: { left: 0, borderLeftWidth: 3 },
  btnNotchR: { right: 0, borderRightWidth: 3 },
  btnText: {
    color: colors.resource,
    fontSize: 15,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  barTrack: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#070A08',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 3,
  },
  barTrackCompact: { gap: 2, padding: 2 },
  barSeg: {
    flex: 1,
    borderRadius: 1,
  },
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
  cell: { gap: 8, padding: 12, minHeight: 118 },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cellIcon: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panelDeep,
  },
  cellIconText: { fontSize: 13, fontWeight: '700' },
  cellTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  cellAmount: {
    fontSize: 16,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cellMeta: {
    color: colors.textDim,
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: -4,
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
    borderRadius: 4,
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
    borderRadius: 4,
  },
  headerBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: fonts.label,
  },
});
