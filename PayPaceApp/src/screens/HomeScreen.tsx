import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BillRow,
  CycleProgress,
  ExpenseRow,
  PrimaryButton,
  SafeSpendHero,
  ScreenBackground,
  SoftCard,
} from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { formatShortDate } from '../services/formatting';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { activeCycle, snapshot, store } = useBudget();
  const currency = store.settings.currencyCode;

  if (!activeCycle) {
    return (
      <ScreenBackground>
        <View style={styles.pad}>
          <Text style={styles.brand}>PayPace</Text>
          <Text style={styles.sub}>No pay cycle yet.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const upcoming = activeCycle.bills.filter((b) => !b.isPaid).slice(0, 3);
  const recent = activeCycle.expenses.slice(0, 4);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.header}>
          <Text style={styles.brand}>PayPace</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => navigation.navigate('PayCycle')}>
              <Text style={styles.link}>Cycle</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.link}>Settings</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.paydayHint}>Payday {formatShortDate(activeCycle.nextPayday)}</Text>

        <SafeSpendHero
          safeToday={snapshot.safeToSpendToday}
          remaining={snapshot.remainingUntilPayday}
          daysUntil={snapshot.daysUntilPayday}
          currencyCode={currency}
          isAtRisk={snapshot.isAtRisk}
        />

        <CycleProgress
          progress={snapshot.cycleProgress}
          daysElapsed={snapshot.daysElapsed}
          totalDays={snapshot.totalDaysInCycle}
        />

        {snapshot.projectedShortfallDays != null && (
          <SoftCard style={{ backgroundColor: 'rgba(219,158,97,0.18)' }}>
            <Text style={styles.warning}>
              At your current pace, you may run short {snapshot.projectedShortfallDays} days before
              payday.
            </Text>
          </SoftCard>
        )}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Upcoming expenses</Text>
          <Pressable onPress={() => navigation.navigate('Bills')}>
            <Text style={styles.link}>See all</Text>
          </Pressable>
        </View>
        <SoftCard>
          {upcoming.length === 0 ? (
            <Text style={styles.sub}>No upcoming bills. Add rent or subscriptions due before payday.</Text>
          ) : (
            upcoming.map((b) => <BillRow key={b.id} bill={b} currencyCode={currency} />)
          )}
        </SoftCard>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Daily spending</Text>
          <Pressable onPress={() => navigation.navigate('AddExpense')}>
            <Text style={styles.link}>Add</Text>
          </Pressable>
        </View>
        <SoftCard>
          {recent.length === 0 ? (
            <Text style={styles.sub}>Nothing logged yet. Categories are optional.</Text>
          ) : (
            recent.map((e) => <ExpenseRow key={e.id} expense={e} currencyCode={currency} />)
          )}
        </SoftCard>

        <PrimaryButton title="Add spending" onPress={() => navigation.navigate('AddExpense')} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, paddingBottom: 48, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 24, fontWeight: '700', color: colors.ink },
  link: { color: colors.accent, fontWeight: '600', fontSize: 15 },
  paydayHint: { color: colors.inkSecondary, fontSize: 13, fontWeight: '500', marginTop: -10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
  warning: { color: colors.ink, fontSize: 15, lineHeight: 21 },
});
