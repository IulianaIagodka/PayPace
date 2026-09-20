import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { formatMoney, formatShortDate } from '../services/formatting';
import type { Bill, DailyExpense } from '../models/types';

export function ScreenBackground({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={[colors.bgTop, colors.bgMid, colors.bgBottom]} style={styles.flex}>
      {children}
    </LinearGradient>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function AmountField({
  label,
  value,
  onChangeText,
  suffix = 'zł',
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
          placeholderTextColor={colors.inkSecondary}
          style={styles.fieldInput}
          {...rest}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

export function SoftCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
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
  const daysLabel =
    daysUntil === 0
      ? 'Payday is today'
      : daysUntil === 1
        ? '1 day until payday'
        : `${daysUntil} days until payday`;

  return (
    <View style={{ gap: 14 }}>
      <Text style={styles.heroEyebrow}>You can safely spend</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <Text style={[styles.heroAmount, isAtRisk && { color: colors.danger }]}>
          {formatMoney(Math.max(safeToday, 0), currencyCode)}
        </Text>
        <Text style={styles.heroToday}>today</Text>
      </View>
      <Text style={styles.heroRemaining}>
        {formatMoney(remaining, currencyCode)} left until payday
      </Text>
      <Text style={styles.heroDays}>{daysLabel}</Text>
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
    <View style={{ gap: 10 }}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(Math.round(progress * 100), 4)}%` }]} />
      </View>
      <View style={styles.progressMeta}>
        <Text style={styles.meta}>Pay cycle</Text>
        <Text style={styles.meta}>
          {Math.min(daysElapsed, totalDays)} of {totalDays} days
        </Text>
      </View>
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

export function ExpenseRow({ expense, currencyCode }: { expense: DailyExpense; currencyCode: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{expense.name}</Text>
        <Text style={styles.meta}>{formatShortDate(expense.date)}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatMoney(expense.amount, currencyCode)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  fieldLabel: { color: colors.inkSecondary, fontSize: 14, fontWeight: '500' },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.whiteSoft,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldInput: { flex: 1, fontSize: 22, fontWeight: '600', color: colors.ink },
  suffix: { color: colors.inkSecondary, fontSize: 18, fontWeight: '500' },
  card: {
    backgroundColor: colors.whiteSofter,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  heroEyebrow: { color: colors.inkSecondary, fontSize: 18, fontWeight: '500' },
  heroAmount: { color: colors.ink, fontSize: 48, fontWeight: '700' },
  heroToday: { color: colors.inkSecondary, fontSize: 22, fontWeight: '500' },
  heroRemaining: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  heroDays: { color: colors.inkSecondary, fontSize: 15 },
  progressTrack: {
    height: 10,
    borderRadius: 99,
    backgroundColor: 'rgba(46,51,49,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: colors.accent,
  },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.inkSecondary, fontSize: 13, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  rowAmount: { color: colors.ink, fontSize: 16, fontWeight: '600' },
});
