import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ExpenseRow,
  PrimaryButton,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formatMoney, toDateKey } from '../services/formatting';
import { categoryBalancesForDisplay } from '../services/categoryBalances';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/** Days left in the calendar week (today → Sunday), inclusive. */
function daysLeftInWeek(from = new Date()): number {
  const day = from.getDay(); // 0 = Sunday
  return day === 0 ? 1 : 7 - day + 1;
}

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store, deleteExpense } = useBudget();
  const currency = store.settings.currencyCode;
  const [dailyOpen, setDailyOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'PayPace',
      headerTitleStyle: { fontWeight: '700', color: colors.ink },
      headerLeft: () => null,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.navBtn}
        >
          <Text style={styles.navBtnText}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const todayKey = toDateKey(new Date());
  const todayExpenses = useMemo(
    () => (activeCycle?.expenses ?? []).filter((e) => e.date === todayKey),
    [activeCycle?.expenses, todayKey],
  );
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cycleTotal = snapshot.spentThisCycle;
  const categoryRows = categoryBalancesForDisplay(activeCycle);
  const weekDays = daysLeftInWeek();
  const leftThisWeek = Math.min(
    Math.max(snapshot.remainingUntilPayday, 0),
    Math.max(snapshot.safeToSpendToday, 0) * weekDays,
  );

  const addSpending = () => {
    Alert.alert('Add spending', 'How do you want to add it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Manually', onPress: () => navigation.navigate('AddExpense') },
      {
        text: 'Photo of receipt',
        onPress: () => navigation.navigate('ReceiptScan'),
      },
    ]);
  };

  if (!activeCycle) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <View style={styles.pad}>
          <Text style={styles.sub}>No pay cycle yet.</Text>
          <PrimaryButton title="Open settings" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Safe to spend today</Text>
          <Text style={[styles.statusHero, snapshot.isAtRisk && { color: colors.danger }]}>
            {formatMoney(Math.max(snapshot.safeToSpendToday, 0), currency)}
          </Text>
        </View>

        <View style={styles.statusBlock}>
          <Text style={styles.statusLabel}>Left this week</Text>
          <Text style={styles.statusSecondary}>
            {formatMoney(leftThisWeek, currency)}
          </Text>
          <Text style={styles.statusHint}>
            {snapshot.daysUntilPayday === 0
              ? 'Payday is today'
              : `${snapshot.daysUntilPayday} days until payday · ${formatMoney(snapshot.remainingUntilPayday, currency)} left in cycle`}
          </Text>
        </View>

        {snapshot.projectedShortfallDays != null ? (
          <Text style={styles.warning}>
            At this pace you may run short {snapshot.projectedShortfallDays} days before payday.
          </Text>
        ) : null}

        <PrimaryButton title="Add spending" onPress={addSpending} />

        <SoftCard>
          <Pressable
            onPress={() => setDailyOpen((v) => !v)}
            style={styles.collapseHead}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Daily spending</Text>
              <Text style={styles.sub}>Today</Text>
            </View>
            <Text style={styles.collapseAmount}>{formatMoney(todayTotal, currency)}</Text>
            <Text style={styles.chevron}>{dailyOpen ? '▾' : '▸'}</Text>
          </Pressable>
          {dailyOpen ? (
            todayExpenses.length === 0 ? (
              <Text style={styles.sub}>Nothing logged today.</Text>
            ) : (
              todayExpenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  currencyCode={currency}
                  onDelete={() =>
                    Alert.alert('Delete spending?', e.name, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteExpense(e.id),
                      },
                    ])
                  }
                />
              ))
            )
          ) : null}
        </SoftCard>

        <SoftCard>
          <Pressable
            onPress={() => setCycleOpen((v) => !v)}
            style={styles.collapseHead}
            accessibilityRole="button"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cycle spending</Text>
              <Text style={styles.sub}>By category</Text>
            </View>
            <Text style={styles.collapseAmount}>{formatMoney(cycleTotal, currency)}</Text>
            <Text style={styles.chevron}>{cycleOpen ? '▾' : '▸'}</Text>
          </Pressable>
          {cycleOpen ? (
            categoryRows.every((r) => r.spent === 0) ? (
              <Text style={styles.sub}>No spending in this pay cycle yet.</Text>
            ) : (
              categoryRows.map((row) => (
                <View key={row.category} style={styles.catRow}>
                  <Text style={styles.catName}>{row.title}</Text>
                  <Text style={styles.catAmount}>{formatMoney(row.spent, currency)}</Text>
                </View>
              ))
            )
          ) : null}
        </SoftCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, paddingBottom: 48, gap: 18 },
  navBtn: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  statusBlock: { gap: 4 },
  statusLabel: { color: colors.inkSecondary, fontSize: 15, fontWeight: '500' },
  statusHero: { color: colors.ink, fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  statusSecondary: { color: colors.ink, fontSize: 28, fontWeight: '700' },
  statusHint: { color: colors.inkSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  sub: { color: colors.inkSecondary, fontSize: 14, lineHeight: 20 },
  warning: { color: colors.warm, fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  collapseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  collapseAmount: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  chevron: { color: colors.inkSecondary, fontSize: 16, width: 16, textAlign: 'center' },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  catName: { color: colors.ink, fontSize: 15, fontWeight: '500' },
  catAmount: { color: colors.ink, fontSize: 15, fontWeight: '700' },
});
