import React from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExpenseRow, HudButton, Panel, ScreenBackground } from '../components/ui';
import { useBudget } from '../store/BudgetContext';
import { chrome } from '../theme/chrome';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export function HistoryScreen({ navigation }: Props) {
  const { activeCycle, store, deleteExpense } = useBudget();
  const currency = store.settings.currencyCode;

  if (!store.settings.isPremium) {
    return (
      <ScreenBackground edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={chrome.pad}>
          <Text style={chrome.title}>HISTORY</Text>
          <Text style={chrome.sub}>
            Plus looks back across finished pay cycles and how your safe-to-spend held up.
          </Text>
          <HudButton title="BACK" onPress={() => navigation.goBack()} variant="secondary" />
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={chrome.pad}>
        <Text style={chrome.title}>HISTORY</Text>
        <Panel>
          {!activeCycle?.expenses.length ? (
            <Text style={chrome.sub}>No spending logged yet.</Text>
          ) : (
            activeCycle.expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                currencyCode={currency}
                showChevron
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
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}
