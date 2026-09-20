import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExpenseRow, PrimaryButton, ScreenBackground, SoftCard } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { activeCycle, store, deleteExpense } = useBudget();
  const currency = store.settings.currencyCode;

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>History is Premium</Text>
          <Text style={styles.sub}>
            Look back across finished pay cycles and how your safe-to-spend held up.
          </Text>
          <PrimaryButton title="See Premium" onPress={() => navigation.navigate('Settings')} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>History</Text>
        <SoftCard>
          {!activeCycle?.expenses.length ? (
            <Text style={styles.sub}>No spending logged yet.</Text>
          ) : (
            activeCycle.expenses.map((e) => (
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
          )}
        </SoftCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '700', color: colors.ink },
  sub: { color: colors.inkSecondary, fontSize: 15, lineHeight: 21 },
});
