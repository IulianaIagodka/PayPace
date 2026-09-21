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
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, colorForTone, toneForRatio, type ResourceTone } from '../theme/colors';
import { formatMoney, formatShortDate } from '../services/formatting';
import type { Bill, DailyExpense } from '../models/types';

export function ScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
}) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.flex} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function Panel({
  children,
  style,
  alt,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  alt?: boolean;
}) {
  return <View style={[styles.panel, alt && styles.panelAlt, style]}>{children}</View>;
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
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
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
}: {
  ratio: number;
  segments?: number;
  height?: number;
  /** When set, briefly animate from this ratio to `ratio`. */
  animateFrom?: number;
}) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const anim = useRef(new Animated.Value(animateFrom ?? clamped)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const tone = toneForRatio(clamped);
  const fill = colorForTone(tone);
  const lit = Math.round(clamped * segments);

  return (
    <View style={[styles.barTrack, { height }]}>
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.barSeg,
            {
              backgroundColor: i < lit ? fill : colors.borderSoft,
              shadowColor: i < lit && tone === 'healthy' ? colors.resource : 'transparent',
              shadowOpacity: i < lit ? 0.55 : 0,
              shadowRadius: 4,
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
      <SegmentedBar ratio={remainingRatio} segments={8} height={12} />
      {depleted ? <Text style={styles.criticalLabel}>DEPLETED</Text> : null}
      {warning && !depleted ? (
        <Text style={styles.warnLabel}>
          WARNING · reserve at {Math.round(remainingRatio * 100)}%
        </Text>
      ) : null}
    </Panel>
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
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  panelAlt: { backgroundColor: colors.panelAlt },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: '#14301A',
    borderColor: colors.resource,
  },
  btnSecondary: {
    backgroundColor: colors.panelAlt,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: '#2A1210',
    borderColor: colors.danger,
  },
  btnText: {
    color: colors.resource,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  barTrack: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: '#0A0C0B',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 3,
  },
  barSeg: {
    flex: 1,
    borderRadius: 3,
  },
  module: { gap: 8 },
  moduleHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  moduleTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  moduleAmount: { color: colors.text, fontSize: 13, fontWeight: '700' },
  warnLabel: { color: colors.warning, fontSize: 11, letterSpacing: 0.8, fontWeight: '600' },
  criticalLabel: { color: colors.critical, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panelAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldInput: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  suffix: { color: colors.textSecondary, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowAmount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: 12 },
  deleteBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  heroAmount: { color: colors.text, fontSize: 40, fontWeight: '800' },
  headerBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  headerBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 11, letterSpacing: 1 },
});
