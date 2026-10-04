import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExpenseRow, PrimaryButton, ScreenBackground, SoftCard } from '../components/ui';
import { PlusUnlockButton } from '../components/PlusUnlockButton';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
import {
  filterExpenses,
  partnerMemberId,
  type PersonFilter,
} from '../services/expenseFilters';
import { CONTROL_PANEL_COPY } from '../services/controlPanel';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const copy = CONTROL_PANEL_COPY.activity;

export function HistoryScreen({ navigation }: Props) {
  const { activeCycle, store, deleteExpense } = useBudget();
  const currency = store.settings.currencyCode;
  const inHousehold = Boolean(store.household);
  const partnerId = partnerMemberId(store.household, store.localMemberId);
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all');

  const expenses = useMemo(
    () =>
      filterExpenses(activeCycle?.expenses ?? [], {
        viewerMemberId: store.localMemberId,
        partnerMemberId: partnerId,
        person: inHousehold ? personFilter : 'all',
      }),
    [activeCycle?.expenses, store.localMemberId, partnerId, personFilter, inHousehold],
  );

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={styles.title}>HISTORY · PLUS</Text>
          <Text style={styles.sub}>
            Look back across finished pay cycles and how your safe-to-spend held up.
          </Text>
          <PlusUnlockButton />
          <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  const personChips: Array<{ id: PersonFilter; label: string; disabled?: boolean }> = [
    { id: 'all', label: copy.filterAll },
    { id: 'mine', label: copy.filterMine },
    { id: 'partner', label: copy.filterPartner, disabled: !partnerId },
  ];

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.title}>HISTORY</Text>

        {inHousehold ? (
          <View style={styles.filterRow}>
            {personChips.map((chip) => {
              const on = personFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  disabled={chip.disabled}
                  onPress={() => setPersonFilter(chip.id)}
                  style={[
                    styles.filterChip,
                    on && styles.filterChipOn,
                    chip.disabled && styles.filterChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      on && styles.filterTextOn,
                      chip.disabled && styles.filterTextDisabled,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <SoftCard>
          {!expenses.length ? (
            <Text style={styles.sub}>
              {(activeCycle?.expenses.length ?? 0) === 0
                ? 'No spending logged yet.'
                : copy.emptyFiltered}
            </Text>
          ) : (
            expenses.map((e) => (
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
  pad: { padding: 20, gap: 14 },
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterChipOn: {
    borderColor: colors.resource,
    backgroundColor: colors.resourceSoft,
  },
  filterChipDisabled: { opacity: 0.4 },
  filterText: { ...hudType.label },
  filterTextOn: { color: colors.resource },
  filterTextDisabled: { color: colors.textSecondary },
});
