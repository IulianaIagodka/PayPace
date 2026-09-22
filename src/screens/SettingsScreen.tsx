import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { HudSelect } from '../components/HudSelect';
import { WEEK_START_OPTIONS, type PaceHorizon, type WeekStartsOn } from '../models/calculator';
import { CURRENCIES } from '../services/currencies';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HORIZON_OPTIONS: Array<{ value: PaceHorizon; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Until payday' },
];

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, resetAll, addCustomCategory, removeCustomCategory } =
    useBudget();
  const s = store.settings;
  const household = store.household;
  const weekStartsOn = (s.weekStartsOn ?? 1) as WeekStartsOn;
  const paceHorizon = (s.paceHorizon ?? 'week') as PaceHorizon;
  const customs = s.customCategories ?? [];
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const currencyOptions = CURRENCIES.map((c) => ({
    value: c.code,
    label: `${c.code} · ${c.symbol}`,
  }));

  const weekOptions = WEEK_START_OPTIONS.map((o) => ({
    value: o.value,
    label: o.short,
  }));

  const onAddCategory = async () => {
    setAdding(true);
    try {
      await addCustomCategory(newCategory);
      setNewCategory('');
    } catch (error) {
      Alert.alert(
        'Custom category',
        error instanceof Error ? error.message : 'Could not add category.',
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          PAY<Text style={{ color: colors.resource }}>PACE</Text>
        </Text>
        <Text style={styles.sub}>Money is energy. Tune your payday budget here.</Text>

        <Panel>
          <Text style={styles.section}>BUDGET</Text>
          <HudButton title="ALLOCATE RESOURCES" onPress={() => navigation.navigate('Allocate')} />
          <Text style={styles.sub}>Plus · set how much each category gets.</Text>
          <HudButton title="EDIT CYCLE" onPress={() => navigation.navigate('PayCycle')} variant="secondary" />
          <HudButton title="BILLS" onPress={() => navigation.navigate('Bills')} variant="secondary" />
        </Panel>

        <Panel>
          <Text style={styles.section}>SHARE</Text>
          <Text style={styles.sub}>
            {household
              ? `Linked · ${household.members.map((m) => m.displayName).join(' & ')}`
              : 'Plus · share one budget with your partner.'}
          </Text>
          <HudButton title="SHARED BUDGET" onPress={() => navigation.navigate('SharedBudget')} />
        </Panel>

        <Panel>
          <Text style={styles.section}>SYSTEM</Text>

          <HudSelect
            label="CURRENCY"
            value={s.currencyCode}
            options={currencyOptions}
            onChange={(code) => updateSettings({ currencyCode: code })}
          />

          <View style={styles.divider} />
          <HudSelect
            label="REMAINING HORIZON"
            value={paceHorizon}
            options={HORIZON_OPTIONS}
            hint="Week follows the calendar week. Until payday counts the days left before payday."
            onChange={(value) => updateSettings({ paceHorizon: value })}
          />

          <View style={styles.divider} />
          <HudSelect
            label="WEEK STARTS ON"
            value={weekStartsOn}
            options={weekOptions}
            hint="Which day starts your calendar week."
            onChange={(value) => updateSettings({ weekStartsOn: value })}
          />

          <View style={styles.divider} />
          <Text style={styles.label}>PLUS</Text>
          <Text style={styles.sub}>
            Free: available balance, safe-to-spend, bills, and manual expenses.{'\n'}
            Plus: leftover by category (including Eating out), custom categories, receipt scan, bank
            statements, history, and shared budget.
          </Text>
          {s.isPremium ? (
            <HudButton title="BACK TO FREE (DEMO)" onPress={() => setPremium(false)} variant="secondary" />
          ) : (
            <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} />
          )}

          <View style={styles.divider} />
          <Text style={styles.label}>CUSTOM CATEGORIES</Text>
          <Text style={styles.sub}>Plus · add your own (Pets, Gym, Travel…). They show up when you log and allocate.</Text>
          {s.isPremium ? (
            <>
              {customs.length === 0 ? (
                <Text style={styles.sub}>No custom categories yet.</Text>
              ) : (
                customs.map((c) => (
                  <View key={c.id} style={styles.customRow}>
                    <Text style={styles.customName}>{c.title}</Text>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Remove category?', c.title, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: () => removeCustomCategory(c.id),
                          },
                        ])
                      }
                    >
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                ))
              )}
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="New category name"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
              />
              <HudButton
                title={adding ? 'ADDING…' : 'ADD CATEGORY'}
                onPress={onAddCategory}
                disabled={!newCategory.trim() || adding}
                variant="secondary"
              />
            </>
          ) : (
            <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} variant="secondary" />
          )}

          <View style={styles.divider} />
          <HudButton
            title="START OVER"
            variant="danger"
            onPress={() =>
              Alert.alert('Start over?', 'This clears the budget on this phone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
              ])
            }
          />
        </Panel>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 14, paddingBottom: 40 },
  brand: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  section: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  customName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  remove: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: colors.panelDeep,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
  },
});
