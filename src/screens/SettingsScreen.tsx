import React, { useState } from 'react';
import { Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HudButton, Panel, ScreenBackground } from '../components/ui';
import { FormScroll } from '../components/FormScroll';
import { HudSelect } from '../components/HudSelect';
import { WEEK_START_OPTIONS, type PaceHorizon, type WeekStartsOn } from '../models/calculator';
import { CURRENCIES } from '../services/currencies';
import { useBudget } from '../store/BudgetContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { hud } from '../theme/hud';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HORIZON_OPTIONS: Array<{ value: PaceHorizon; label: string }> = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Until payday' },
];

export function SettingsScreen({ navigation }: Props) {
  const { store, updateSettings, setPremium, addCustomCategory, removeCustomCategory } =
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
      <FormScroll contentContainerStyle={styles.pad}>
        <Text style={styles.brand}>
          PAY<Text style={{ color: colors.resource }}>PACE</Text>
        </Text>
        <Text style={styles.sub}>Money is energy. Tune your payday budget here.</Text>

        <Panel>
          <Text style={styles.section}>BUDGET</Text>
          {s.isPremium ? (
            <HudButton
              title="ALLOCATE RESOURCES"
              onPress={() => navigation.navigate('Allocate')}
              variant="secondary"
            />
          ) : null}
          <HudButton
            title="EDIT CYCLE"
            onPress={() => navigation.navigate('PayCycle')}
            variant="secondary"
          />
          <HudButton title="BILLS" onPress={() => navigation.navigate('Bills')} variant="secondary" />
        </Panel>

        <Panel>
          <Text style={styles.section}>SHARE</Text>
          {household ? (
            <Text style={styles.subTight}>
              Linked · {household.members.map((m) => m.displayName).join(' & ')}
            </Text>
          ) : null}
          <HudButton
            title="SHARED BUDGET"
            onPress={() => navigation.navigate('SharedBudget')}
            variant="secondary"
          />
        </Panel>

        <Panel>
          <Text style={styles.section}>SYSTEM</Text>

          <View style={styles.selectStack}>
            <HudSelect
              label="CURRENCY"
              value={s.currencyCode}
              options={currencyOptions}
              onChange={(code) => updateSettings({ currencyCode: code })}
              compact
            />
            <HudSelect
              label="REMAINING HORIZON"
              value={paceHorizon}
              options={HORIZON_OPTIONS}
              onChange={(value) => updateSettings({ paceHorizon: value })}
              compact
            />
            <HudSelect
              label="WEEK STARTS ON"
              value={weekStartsOn}
              options={weekOptions}
              onChange={(value) => updateSettings({ weekStartsOn: value })}
              compact
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.label}>PLUS</Text>
          <Text style={styles.subTight}>
            Free: balance, safe-to-spend, bills, expenses.{'\n'}
            Plus: allocate by category, custom categories, receipts, statements, history, shared
            budget.
          </Text>
          {s.isPremium ? (
            <HudButton
              title="BACK TO FREE (DEMO)"
              onPress={() => setPremium(false)}
              variant="secondary"
            />
          ) : (
            <HudButton title="TRY PLUS (DEMO)" onPress={() => setPremium(true)} />
          )}

          {s.isPremium ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>CUSTOM CATEGORIES</Text>
              {customs.map((c) => (
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
              ))}
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="New category name"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  if (newCategory.trim()) onAddCategory();
                }}
              />
              <HudButton
                title={adding ? 'ADDING…' : 'ADD CATEGORY'}
                onPress={onAddCategory}
                disabled={!newCategory.trim() || adding}
                variant="secondary"
              />
            </>
          ) : null}
        </Panel>
      </FormScroll>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  brand: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: fonts.display,
  },
  sub: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  subTight: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
  section: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.6,
    marginBottom: 4,
    fontFamily: fonts.label,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: fonts.label,
  },
  selectStack: { gap: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  customName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  remove: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  input: {
    backgroundColor: colors.panelDeep,
    borderWidth: hud.stroke,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
});
